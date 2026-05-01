from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from utils.permissions import IsAdmin, IsAdminOrTeacher
from .models import AcademicYear, Class, Section, Subject
from .serializers import (
    AcademicYearSerializer, ClassSerializer,
    SectionSerializer, SectionAssignTeacherSerializer,
    SubjectSerializer,
)


# ── Academic Years ────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def academic_year_list_create(request):
    if request.method == 'GET':
        qs = AcademicYear.objects.all()
        return Response(AcademicYearSerializer(qs, many=True).data)

    serializer = AcademicYearSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def academic_year_detail(request, pk):
    try:
        obj = AcademicYear.objects.get(pk=pk)
    except AcademicYear.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AcademicYearSerializer(obj).data)

    if request.method in ('PUT', 'PATCH'):
        serializer = AcademicYearSerializer(obj, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAdminOrTeacher])
def current_academic_year(request):
    try:
        obj = AcademicYear.objects.get(is_current=True)
        return Response(AcademicYearSerializer(obj).data)
    except AcademicYear.DoesNotExist:
        return Response({'error': 'No current academic year set.'}, status=status.HTTP_404_NOT_FOUND)


# ── Classes ───────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def class_list_create(request):
    if request.method == 'GET':
        qs = Class.objects.all()
        return Response(ClassSerializer(qs, many=True).data)

    serializer = ClassSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def class_detail(request, pk):
    try:
        obj = Class.objects.get(pk=pk)
    except Class.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ClassSerializer(obj).data)

    if request.method in ('PUT', 'PATCH'):
        serializer = ClassSerializer(obj, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Sections ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def section_list_create(request):
    if request.method == 'GET':
        qs = Section.objects.select_related('class_group', 'academic_year', 'class_teacher').all()
        year_id = request.query_params.get('academic_year')
        class_id = request.query_params.get('class_group')
        if year_id:
            qs = qs.filter(academic_year_id=year_id)
        if class_id:
            qs = qs.filter(class_group_id=class_id)
        return Response(SectionSerializer(qs, many=True).data)

    serializer = SectionSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def section_detail(request, pk):
    try:
        obj = Section.objects.select_related('class_group', 'academic_year', 'class_teacher').get(pk=pk)
    except Section.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(SectionSerializer(obj).data)

    if request.method in ('PUT', 'PATCH'):
        serializer = SectionSerializer(obj, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def section_assign_teacher(request, pk):
    try:
        obj = Section.objects.get(pk=pk)
    except Section.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = SectionAssignTeacherSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    teacher_id = serializer.validated_data['class_teacher_id']
    if teacher_id is None:
        obj.class_teacher = None
    else:
        from apps.accounts.models import User
        obj.class_teacher = User.objects.get(pk=teacher_id)
    obj.save(update_fields=['class_teacher'])
    return Response(SectionSerializer(obj).data)


# ── Subjects ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrTeacher])
def subject_list_create(request):
    if request.method == 'GET':
        qs = Subject.objects.select_related('class_group').all()
        class_id = request.query_params.get('class_group')
        if class_id:
            qs = qs.filter(class_group_id=class_id)
        return Response(SubjectSerializer(qs, many=True).data)

    if request.user.role != 'admin':
        return Response({'error': 'Only admins can create subjects.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = SubjectSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdminOrTeacher])
def subject_detail(request, pk):
    try:
        obj = Subject.objects.select_related('class_group').get(pk=pk)
    except Subject.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(SubjectSerializer(obj).data)

    if request.user.role != 'admin':
        return Response({'error': 'Only admins can modify subjects.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method in ('PUT', 'PATCH'):
        serializer = SubjectSerializer(obj, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
