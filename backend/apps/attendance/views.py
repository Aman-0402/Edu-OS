from django.db import transaction, IntegrityError
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from utils.permissions import IsAdmin, IsAdminOrTeacher
from apps.students.models import Enrollment
from .models import AttendanceSession, AttendanceRecord
from .serializers import (
    AttendanceSessionSerializer,
    BulkMarkAttendanceSerializer,
    StudentAttendanceSummarySerializer,
    SectionAttendanceReportSerializer,
)


# ── Bulk mark attendance (idempotent) ─────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def bulk_mark_attendance(request):
    """
    Create or fully replace the attendance session for section+date.
    Idempotent: calling twice with different records replaces the first submission.
    """
    serializer = BulkMarkAttendanceSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    section_id = data['section']
    date = data['date']
    records_data = data['records']

    with transaction.atomic():
        session, _ = AttendanceSession.objects.get_or_create(
            section_id=section_id,
            date=date,
            defaults={'marked_by': request.user},
        )
        # Replace all existing records (idempotent resubmit)
        session.records.all().delete()
        session.marked_by = request.user
        session.save(update_fields=['marked_by', 'updated_at'])

        records = [
            AttendanceRecord(
                session=session,
                student_id=r['student'],
                status=r['status'],
                remarks=r.get('remarks', ''),
            )
            for r in records_data
        ]
        AttendanceRecord.objects.bulk_create(records)

    session.refresh_from_db()
    return Response(
        AttendanceSessionSerializer(session).data,
        status=status.HTTP_201_CREATED,
    )


# ── Get session for section + date ────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def get_session(request):
    """GET ?section=<id>&date=<YYYY-MM-DD>"""
    section_id = request.query_params.get('section')
    date = request.query_params.get('date')

    if not section_id or not date:
        return Response(
            {'error': 'Both section and date query params are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session = AttendanceSession.objects.prefetch_related(
            'records__student__user'
        ).select_related('section__class_group', 'marked_by').get(
            section_id=section_id, date=date
        )
        return Response(AttendanceSessionSerializer(session).data)
    except AttendanceSession.DoesNotExist:
        return Response(None)


# ── Enrolled students for a section (for marking grid) ───────────────────────

@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def section_students(request):
    """GET ?section=<id>  — returns enrolled active students for the marking grid."""
    section_id = request.query_params.get('section')
    if not section_id:
        return Response({'error': 'section param required.'}, status=status.HTTP_400_BAD_REQUEST)

    enrollments = (
        Enrollment.objects
        .filter(section_id=section_id, status='active')
        .select_related('student__user')
        .order_by('student__user__first_name')
    )
    students = [
        {
            'id': e.student.id,
            'name': e.student.user.get_full_name(),
            'admission_number': e.student.admission_number,
        }
        for e in enrollments
    ]
    return Response(students)


# ── Student monthly summary ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def student_summary(request, student_id):
    """GET /attendance/summary/<student_id>/?month=M&year=Y"""
    month = request.query_params.get('month')
    year = request.query_params.get('year')

    if not month or not year:
        return Response(
            {'error': 'month and year query params are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        month, year = int(month), int(year)
    except ValueError:
        return Response({'error': 'month and year must be integers.'}, status=status.HTTP_400_BAD_REQUEST)

    records = AttendanceRecord.objects.filter(
        student_id=student_id,
        session__date__month=month,
        session__date__year=year,
    ).select_related('student__user')

    counts = {s: 0 for s in ['P', 'A', 'L', 'H', 'E']}
    student_obj = None
    for r in records:
        student_obj = r.student
        if r.status in counts:
            counts[r.status] += 1

    if not student_obj:
        try:
            from apps.students.models import StudentProfile
            student_obj = StudentProfile.objects.select_related('user').get(pk=student_id)
        except StudentProfile.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    total = sum(counts.values())
    present_days = counts['P'] + counts['L'] + counts['H']
    percentage = round((present_days / total * 100), 1) if total > 0 else 0.0

    data = {
        'student_id': student_obj.id,
        'student_name': student_obj.user.get_full_name(),
        'admission_number': student_obj.admission_number,
        'month': month,
        'year': year,
        'total_days': total,
        'present': counts['P'],
        'absent': counts['A'],
        'late': counts['L'],
        'half_day': counts['H'],
        'excused': counts['E'],
        'percentage': percentage,
    }
    return Response(StudentAttendanceSummarySerializer(data).data)


# ── Section attendance report (date range) ────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def section_report(request):
    """GET ?section=<id>&from_date=YYYY-MM-DD&to_date=YYYY-MM-DD"""
    section_id = request.query_params.get('section')
    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')

    if not section_id or not from_date or not to_date:
        return Response(
            {'error': 'section, from_date, and to_date are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    records = (
        AttendanceRecord.objects
        .filter(
            session__section_id=section_id,
            session__date__gte=from_date,
            session__date__lte=to_date,
        )
        .select_related('student__user')
    )

    # Aggregate per student
    aggregated = {}
    for r in records:
        sid = r.student.id
        if sid not in aggregated:
            aggregated[sid] = {
                'student_id': sid,
                'student_name': r.student.user.get_full_name(),
                'admission_number': r.student.admission_number,
                'present': 0, 'absent': 0, 'late': 0, 'half_day': 0, 'excused': 0,
            }
        status_map = {'P': 'present', 'A': 'absent', 'L': 'late', 'H': 'half_day', 'E': 'excused'}
        key = status_map.get(r.status)
        if key:
            aggregated[sid][key] += 1

    result = []
    for entry in aggregated.values():
        total = sum(entry[k] for k in ('present', 'absent', 'late', 'half_day', 'excused'))
        present_days = entry['present'] + entry['late'] + entry['half_day']
        entry['total_days'] = total
        entry['percentage'] = round((present_days / total * 100), 1) if total > 0 else 0.0
        result.append(entry)

    result.sort(key=lambda x: x['student_name'])
    return Response(SectionAttendanceReportSerializer(result, many=True).data)


# ── List sessions (admin view) ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def session_list(request):
    """GET ?section=<id>&academic_year=<id>&from_date=D&to_date=D"""
    qs = AttendanceSession.objects.select_related(
        'section__class_group', 'marked_by'
    )
    section_id = request.query_params.get('section')
    year_id = request.query_params.get('academic_year')
    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')

    if section_id:
        qs = qs.filter(section_id=section_id)
    if year_id:
        qs = qs.filter(section__academic_year_id=year_id)
    if from_date:
        qs = qs.filter(date__gte=from_date)
    if to_date:
        qs = qs.filter(date__lte=to_date)

    # Return without nested records for list view (lighter payload)
    data = [
        {
            'id': s.id,
            'section': s.section_id,
            'section_name': f"{s.section.class_group.name} - {s.section.name}",
            'date': s.date,
            'marked_by_name': s.marked_by.get_full_name() if s.marked_by else None,
            'record_count': s.records.count(),
        }
        for s in qs
    ]
    return Response(data)
