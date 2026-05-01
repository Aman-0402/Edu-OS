import csv
from datetime import date, timedelta

from django.db.models import Count, Sum, Q, F
from django.http import HttpResponse
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from utils.permissions import IsAdmin
from apps.accounts.models import User
from apps.academics.models import AcademicYear, Section
from apps.students.models import StudentProfile, Enrollment
from apps.attendance.models import AttendanceSession, AttendanceRecord
from apps.fees.models import StudentFee, FeePayment, FeeCategory


# ── Admin KPI Dashboard ───────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def admin_kpis(request):
    today = timezone.localdate()

    total_students = StudentProfile.objects.filter(is_active=True).count()
    total_teachers = User.objects.filter(role='teacher', is_active=True).count()

    # Today's attendance across all sections
    sessions_today = AttendanceSession.objects.filter(date=today)
    records_today = AttendanceRecord.objects.filter(session__in=sessions_today)
    total_today = records_today.count()
    present_today = records_today.filter(status='P').count()
    attendance_pct = round(present_today / total_today * 100, 1) if total_today else None

    # Current academic year fee collection
    try:
        current_year = AcademicYear.objects.get(is_current=True)
        year_payments = FeePayment.objects.filter(
            student_fee__fee_structure__academic_year=current_year
        )
        fees_collected = year_payments.aggregate(total=Sum('amount_paid'))['total'] or 0
        fees_outstanding = StudentFee.objects.filter(
            fee_structure__academic_year=current_year,
            status__in=['pending', 'partial'],
        ).aggregate(total=Sum(F('amount_due') - F('discount')))['total'] or 0
        year_name = current_year.name
    except AcademicYear.DoesNotExist:
        fees_collected = fees_outstanding = 0
        year_name = None

    # Active enrollments this year (students actually in class)
    active_enrollments = Enrollment.objects.filter(
        academic_year__is_current=True, status='active'
    ).count()

    return Response({
        'total_students': total_students,
        'total_teachers': total_teachers,
        'active_enrollments': active_enrollments,
        'attendance_today': {
            'present': present_today,
            'total': total_today,
            'percentage': attendance_pct,
        },
        'fees': {
            'collected': float(fees_collected),
            'outstanding': float(fees_outstanding),
            'academic_year': year_name,
        },
    })


# ── Attendance Trend (last N days, school-wide) ───────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def attendance_trend(request):
    days = int(request.query_params.get('days', 30))
    section_id = request.query_params.get('section')
    end = timezone.localdate()
    start = end - timedelta(days=days - 1)

    sessions = AttendanceSession.objects.filter(date__range=[start, end])
    if section_id:
        sessions = sessions.filter(section_id=section_id)

    records = AttendanceRecord.objects.filter(session__in=sessions)

    # Aggregate per day
    from django.db.models.functions import TruncDate
    daily = (
        records
        .annotate(day=TruncDate('session__date'))
        .values('day')
        .annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status='P')),
        )
        .order_by('day')
    )

    data = [
        {
            'date': str(row['day']),
            'present': row['present'],
            'total': row['total'],
            'percentage': round(row['present'] / row['total'] * 100, 1) if row['total'] else 0,
        }
        for row in daily
    ]
    return Response(data)


# ── Fee Collection Trend (monthly, current year) ──────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def fee_collection_trend(request):
    year_id = request.query_params.get('year')
    if year_id:
        qs = FeePayment.objects.filter(student_fee__fee_structure__academic_year_id=year_id)
    else:
        try:
            current = AcademicYear.objects.get(is_current=True)
            qs = FeePayment.objects.filter(student_fee__fee_structure__academic_year=current)
        except AcademicYear.DoesNotExist:
            return Response([])

    from django.db.models.functions import TruncMonth
    monthly = (
        qs
        .annotate(month=TruncMonth('payment_date'))
        .values('month')
        .annotate(collected=Sum('amount_paid'))
        .order_by('month')
    )

    data = [
        {'month': row['month'].strftime('%b %Y'), 'collected': float(row['collected'] or 0)}
        for row in monthly
    ]
    return Response(data)


# ── Student Strength by Class ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def student_strength(request):
    year_id = request.query_params.get('year')
    if not year_id:
        try:
            year_id = AcademicYear.objects.get(is_current=True).id
        except AcademicYear.DoesNotExist:
            return Response([])

    data = (
        Enrollment.objects
        .filter(academic_year_id=year_id, status='active')
        .values('section__class_group__name', 'section__name')
        .annotate(count=Count('id'))
        .order_by('section__class_group__numeric_value', 'section__name')
    )

    result = [
        {
            'class': row['section__class_group__name'],
            'section': row['section__name'],
            'label': f"{row['section__class_group__name']}-{row['section__name']}",
            'count': row['count'],
        }
        for row in data
    ]
    return Response(result)


# ── Fee Category Breakdown ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def fee_category_breakdown(request):
    year_id = request.query_params.get('year')
    if not year_id:
        try:
            year_id = AcademicYear.objects.get(is_current=True).id
        except AcademicYear.DoesNotExist:
            return Response([])

    data = (
        FeePayment.objects
        .filter(student_fee__fee_structure__academic_year_id=year_id)
        .values('student_fee__fee_structure__category__name')
        .annotate(collected=Sum('amount_paid'))
        .order_by('-collected')
    )

    result = [
        {'category': row['student_fee__fee_structure__category__name'], 'collected': float(row['collected'] or 0)}
        for row in data
    ]
    return Response(result)


# ── CSV Exports ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def export_attendance_csv(request):
    section_id = request.query_params.get('section')
    start = request.query_params.get('start')
    end = request.query_params.get('end')

    records = AttendanceRecord.objects.select_related(
        'session', 'session__section', 'session__section__class_group', 'student', 'student__user'
    )
    if section_id:
        records = records.filter(session__section_id=section_id)
    if start:
        records = records.filter(session__date__gte=start)
    if end:
        records = records.filter(session__date__lte=end)
    records = records.order_by('session__date', 'student__user__last_name')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="attendance.csv"'
    writer = csv.writer(response)
    writer.writerow(['Date', 'Section', 'Student', 'Admission No', 'Status', 'Remarks'])
    for r in records:
        writer.writerow([
            r.session.date,
            f"{r.session.section.class_group.name}-{r.session.section.name}",
            r.student.user.get_full_name(),
            r.student.admission_number,
            r.get_status_display(),
            r.remarks or '',
        ])
    return response


@api_view(['GET'])
@permission_classes([IsAdmin])
def export_fees_csv(request):
    year_id = request.query_params.get('year')
    qs = StudentFee.objects.select_related(
        'student__user', 'fee_structure__category', 'fee_structure__class_group',
        'fee_structure__academic_year',
    )
    if year_id:
        qs = qs.filter(fee_structure__academic_year_id=year_id)
    else:
        try:
            current = AcademicYear.objects.get(is_current=True)
            qs = qs.filter(fee_structure__academic_year=current)
        except AcademicYear.DoesNotExist:
            pass
    qs = qs.order_by('student__user__last_name', 'fee_structure__category__name')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="fees.csv"'
    writer = csv.writer(response)
    writer.writerow(['Student', 'Admission No', 'Class', 'Category', 'Amount Due', 'Discount', 'Net', 'Paid', 'Balance', 'Status'])
    for f in qs:
        net = float(f.amount_due) - float(f.discount)
        paid = float(f.payments.aggregate(s=Sum('amount_paid'))['s'] or 0)
        writer.writerow([
            f.student.user.get_full_name(),
            f.student.admission_number,
            f.fee_structure.class_group.name,
            f.fee_structure.category.name,
            float(f.amount_due),
            float(f.discount),
            net,
            paid,
            net - paid,
            f.status,
        ])
    return response
