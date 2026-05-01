from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from utils.permissions import IsAdmin, IsParent
from .models import ParentProfile, ParentStudentLink
from .serializers import (
    ParentProfileSerializer,
    ParentCreateSerializer,
    ParentStudentLinkSerializer,
    ChildSummarySerializer,
)


# ── Admin: manage parents ─────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def parent_list_create(request):
    if request.method == 'GET':
        qs = ParentProfile.objects.select_related('user').filter(is_active=True)
        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(user__first_name__icontains=search) \
                 | qs.filter(user__last_name__icontains=search) \
                 | qs.filter(user__email__icontains=search)
        return Response(ParentProfileSerializer(qs.distinct(), many=True).data)

    s = ParentCreateSerializer(data=request.data)
    if s.is_valid():
        with transaction.atomic():
            profile = s.save()
        return Response(ParentProfileSerializer(profile).data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def parent_detail(request, pk):
    try:
        profile = ParentProfile.objects.select_related('user').get(pk=pk)
    except ParentProfile.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ParentProfileSerializer(profile).data)
    if request.method == 'PATCH':
        from apps.accounts.serializers import UserDetailSerializer
        user_fields = {k: v for k, v in request.data.items() if k in ('first_name', 'last_name', 'phone')}
        profile_fields = {k: v for k, v in request.data.items() if k in ('occupation', 'address')}
        if user_fields:
            for attr, val in user_fields.items():
                setattr(profile.user, attr, val)
            profile.user.save(update_fields=list(user_fields.keys()))
        for attr, val in profile_fields.items():
            setattr(profile, attr, val)
        if profile_fields:
            profile.save(update_fields=list(profile_fields.keys()))
        return Response(ParentProfileSerializer(profile).data)
    profile.is_active = False
    profile.user.is_active = False
    profile.save(update_fields=['is_active'])
    profile.user.save(update_fields=['is_active'])
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Admin: parent-student links ───────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def link_list_create(request):
    if request.method == 'GET':
        qs = ParentStudentLink.objects.select_related(
            'parent__user', 'student__user'
        )
        parent_id = request.query_params.get('parent')
        student_id = request.query_params.get('student')
        if parent_id:
            qs = qs.filter(parent_id=parent_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        return Response(ParentStudentLinkSerializer(qs, many=True).data)

    s = ParentStudentLinkSerializer(data=request.data)
    if s.is_valid():
        link = s.save()
        return Response(ParentStudentLinkSerializer(link).data, status=status.HTTP_201_CREATED)
    return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def link_detail(request, pk):
    try:
        link = ParentStudentLink.objects.get(pk=pk)
    except ParentStudentLink.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    link.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Parent portal: read-only child data ───────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsParent])
def my_children(request):
    """Returns summary cards for each linked child."""
    try:
        parent_profile = request.user.parent_profile
    except ParentProfile.DoesNotExist:
        return Response([])

    links = ParentStudentLink.objects.filter(
        parent=parent_profile
    ).select_related('student__user')

    result = []
    for link in links:
        student = link.student
        # Get current active enrollment
        current_enrollment = (
            student.enrollments
            .select_related('section__class_group', 'academic_year')
            .filter(status='active')
            .order_by('-academic_year__start_date')
            .first()
        )
        result.append({
            'student_id': student.id,
            'full_name': student.user.get_full_name(),
            'admission_number': student.admission_number,
            'relationship': link.relationship,
            'current_class': current_enrollment.section.class_group.name if current_enrollment else None,
            'current_section': current_enrollment.section.name if current_enrollment else None,
        })

    return Response(ChildSummarySerializer(result, many=True).data)


@api_view(['GET'])
@permission_classes([IsParent])
def child_attendance(request, student_id):
    """Monthly attendance summary for a linked child."""
    if not _parent_owns_child(request.user, student_id):
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    month = request.query_params.get('month')
    year = request.query_params.get('year')
    if not month or not year:
        return Response({'error': 'month and year are required.'}, status=status.HTTP_400_BAD_REQUEST)

    from apps.attendance.views import student_summary
    # Delegate to attendance app's summary view
    return student_summary(request, student_id)


@api_view(['GET'])
@permission_classes([IsParent])
def child_fees(request, student_id):
    """Fee records for a linked child."""
    if not _parent_owns_child(request.user, student_id):
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    from apps.fees.models import StudentFee
    from apps.fees.serializers import StudentFeeSerializer
    qs = StudentFee.objects.filter(
        student_id=student_id
    ).select_related(
        'fee_structure__category', 'fee_structure__class_group', 'fee_structure__academic_year'
    ).prefetch_related('payments')

    year_id = request.query_params.get('academic_year')
    if year_id:
        qs = qs.filter(fee_structure__academic_year_id=year_id)

    return Response(StudentFeeSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsParent])
def child_announcements(request, student_id):
    """Active announcements visible to the child's class."""
    if not _parent_owns_child(request.user, student_id):
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    from apps.students.models import StudentProfile
    from apps.teachers.models import Announcement
    from apps.teachers.serializers import AnnouncementSerializer

    try:
        student = StudentProfile.objects.get(pk=student_id)
    except StudentProfile.DoesNotExist:
        return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Get current class via latest active enrollment
    enrollment = (
        student.enrollments
        .select_related('section__class_group')
        .filter(status='active')
        .order_by('-academic_year__start_date')
        .first()
    )
    class_id = enrollment.section.class_group_id if enrollment else None

    qs = Announcement.objects.filter(
        is_active=True,
        target_audience__in=['all', 'parents'],
    ).select_related('posted_by', 'target_class')

    if class_id:
        from django.db.models import Q
        qs = qs.filter(Q(target_class__isnull=True) | Q(target_class_id=class_id))

    return Response(AnnouncementSerializer(qs, many=True).data)


# ── Helper ────────────────────────────────────────────────────────────────────

def _parent_owns_child(user, student_id):
    try:
        profile = user.parent_profile
    except ParentProfile.DoesNotExist:
        return False
    return ParentStudentLink.objects.filter(
        parent=profile, student_id=student_id
    ).exists()
