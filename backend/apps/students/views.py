from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated
from utils.permissions import IsAdmin, IsAdminOrTeacher, IsStudent
from utils.pagination import StandardResultsPagination
from .models import StudentProfile, Enrollment
from .serializers import (
    StudentProfileSerializer,
    StudentCreateSerializer,
    StudentUpdateSerializer,
    EnrollmentSerializer,
)


# ── Students ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def student_list_create(request):
    if request.method == 'GET':
        qs = StudentProfile.objects.select_related('user').filter(is_active=True)

        search = request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(user__first_name__icontains=search) \
                 | qs.filter(user__last_name__icontains=search) \
                 | qs.filter(user__email__icontains=search) \
                 | qs.filter(admission_number__icontains=search)

        gender = request.query_params.get('gender')
        if gender:
            qs = qs.filter(gender=gender)

        qs = qs.distinct()
        paginator = StandardResultsPagination()
        page = paginator.paginate_queryset(qs, request)
        if page is not None:
            return paginator.get_paginated_response(StudentProfileSerializer(page, many=True).data)
        return Response(StudentProfileSerializer(qs, many=True).data)

    serializer = StudentCreateSerializer(data=request.data)
    if serializer.is_valid():
        with transaction.atomic():
            profile = serializer.save()
        return Response(StudentProfileSerializer(profile).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def student_detail(request, pk):
    try:
        profile = StudentProfile.objects.select_related('user').get(pk=pk)
    except StudentProfile.DoesNotExist:
        return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(StudentProfileSerializer(profile).data)

    if request.method == 'PATCH':
        serializer = StudentUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(StudentProfileSerializer(profile).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Soft delete
    profile.is_active = False
    profile.user.is_active = False
    profile.save(update_fields=['is_active'])
    profile.user.save(update_fields=['is_active'])
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Student self-view ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsStudent])
def student_me(request):
    try:
        profile = StudentProfile.objects.select_related('user').get(user=request.user)
    except StudentProfile.DoesNotExist:
        return Response({'error': 'Student profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    data = StudentProfileSerializer(profile).data

    # Current active enrollment
    enrollment = (
        Enrollment.objects
        .select_related('section__class_group', 'academic_year')
        .filter(student=profile, status='active', academic_year__is_current=True)
        .first()
    )
    if enrollment:
        data['current_enrollment'] = EnrollmentSerializer(enrollment).data
    else:
        data['current_enrollment'] = None

    return Response(data)


# ── Enrollments ───────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrTeacher])
def enrollment_list_create(request):
    if request.method == 'GET':
        qs = Enrollment.objects.select_related(
            'student__user', 'section__class_group', 'academic_year'
        )
        year_id = request.query_params.get('academic_year')
        section_id = request.query_params.get('section')
        student_id = request.query_params.get('student')

        if year_id:
            qs = qs.filter(academic_year_id=year_id)
        if section_id:
            qs = qs.filter(section_id=section_id)
        if student_id:
            qs = qs.filter(student_id=student_id)

        return Response(EnrollmentSerializer(qs, many=True).data)

    if request.user.role != 'admin':
        return Response({'error': 'Only admins can enroll students.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = EnrollmentSerializer(data=request.data)
    if serializer.is_valid():
        enrollment = serializer.save()
        return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def enrollment_detail(request, pk):
    try:
        enrollment = Enrollment.objects.select_related(
            'student__user', 'section__class_group', 'academic_year'
        ).get(pk=pk)
    except Enrollment.DoesNotExist:
        return Response({'error': 'Enrollment not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(EnrollmentSerializer(enrollment).data)

    if request.method == 'PATCH':
        serializer = EnrollmentSerializer(enrollment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(EnrollmentSerializer(enrollment).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    enrollment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
