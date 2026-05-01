from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated
from utils.permissions import IsAdmin, IsAdminOrTeacher, IsTeacher
from .models import TeacherProfile, TeacherAssignment, Announcement
from .serializers import (
    TeacherProfileSerializer,
    TeacherCreateSerializer,
    TeacherUpdateSerializer,
    TeacherAssignmentSerializer,
    AnnouncementSerializer,
)


# ── Teachers ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def teacher_list_create(request):
    if request.method == 'GET':
        qs = TeacherProfile.objects.select_related('user').filter(is_active=True)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(user__first_name__icontains=search) \
                 | qs.filter(user__last_name__icontains=search) \
                 | qs.filter(user__email__icontains=search) \
                 | qs.filter(employee_id__icontains=search)

        return Response(TeacherProfileSerializer(qs.distinct(), many=True).data)

    serializer = TeacherCreateSerializer(data=request.data)
    if serializer.is_valid():
        with transaction.atomic():
            profile = serializer.save()
        return Response(TeacherProfileSerializer(profile).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def teacher_detail(request, pk):
    try:
        profile = TeacherProfile.objects.select_related('user').get(pk=pk)
    except TeacherProfile.DoesNotExist:
        return Response({'error': 'Teacher not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(TeacherProfileSerializer(profile).data)

    if request.method == 'PATCH':
        serializer = TeacherUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(TeacherProfileSerializer(profile).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Soft delete
    profile.is_active = False
    profile.user.is_active = False
    profile.save(update_fields=['is_active'])
    profile.user.save(update_fields=['is_active'])
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Teacher self-view ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsTeacher])
def teacher_me(request):
    try:
        profile = TeacherProfile.objects.select_related('user').get(user=request.user)
    except TeacherProfile.DoesNotExist:
        return Response({'error': 'Teacher profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = TeacherProfileSerializer(profile).data

    # Current assignments (current academic year)
    assignments = TeacherAssignment.objects.select_related(
        'section__class_group', 'subject', 'academic_year'
    ).filter(teacher=profile, academic_year__is_current=True)
    data['assignments'] = TeacherAssignmentSerializer(assignments, many=True).data

    # Sections I am class teacher of
    from apps.academics.models import Section
    class_teacher_sections = Section.objects.select_related('class_group', 'academic_year').filter(
        class_teacher=request.user, academic_year__is_current=True
    )
    from apps.academics.serializers import SectionSerializer
    data['class_teacher_of'] = SectionSerializer(class_teacher_sections, many=True).data

    return Response(data)


# ── Teacher Assignments ───────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def assignment_list_create(request):
    if request.method == 'GET':
        qs = TeacherAssignment.objects.select_related(
            'teacher__user', 'section__class_group', 'subject', 'academic_year'
        )
        year_id = request.query_params.get('academic_year')
        teacher_id = request.query_params.get('teacher')
        section_id = request.query_params.get('section')

        if year_id:
            qs = qs.filter(academic_year_id=year_id)
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)
        if section_id:
            qs = qs.filter(section_id=section_id)

        return Response(TeacherAssignmentSerializer(qs, many=True).data)

    serializer = TeacherAssignmentSerializer(data=request.data)
    if serializer.is_valid():
        assignment = serializer.save()
        return Response(TeacherAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def assignment_detail(request, pk):
    try:
        assignment = TeacherAssignment.objects.get(pk=pk)
    except TeacherAssignment.DoesNotExist:
        return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

    assignment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Announcements ─────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def announcement_list_create(request):
    if request.method == 'GET':
        qs = Announcement.objects.select_related('posted_by', 'target_class').filter(is_active=True)
        audience = request.query_params.get('audience')
        if audience:
            qs = qs.filter(target_audience__in=[audience, 'all'])
        return Response(AnnouncementSerializer(qs, many=True).data)

    if request.user.role not in ('admin', 'teacher'):
        return Response({'error': 'Only admins and teachers can post announcements.'}, status=status.HTTP_403_FORBIDDEN)
    serializer = AnnouncementSerializer(data=request.data)
    if serializer.is_valid():
        announcement = serializer.save(posted_by=request.user)
        return Response(AnnouncementSerializer(announcement).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrTeacher])
def announcement_detail(request, pk):
    try:
        announcement = Announcement.objects.select_related('posted_by', 'target_class').get(pk=pk)
    except Announcement.DoesNotExist:
        return Response({'error': 'Announcement not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AnnouncementSerializer(announcement).data)

    # Only admin or the original poster can edit/delete
    if request.user.role != 'admin' and announcement.posted_by_id != request.user.id:
        return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PATCH':
        serializer = AnnouncementSerializer(announcement, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(AnnouncementSerializer(announcement).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    announcement.is_active = False
    announcement.save(update_fields=['is_active'])
    return Response(status=status.HTTP_204_NO_CONTENT)
