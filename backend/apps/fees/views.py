from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from utils.permissions import IsAdmin
from .models import FeeCategory, FeeStructure, StudentFee, FeePayment
from .serializers import (
    FeeCategorySerializer,
    FeeStructureSerializer,
    StudentFeeSerializer,
    FeePaymentSerializer,
    RecordPaymentSerializer,
    BulkAssignFeesSerializer,
)


# ── Fee Categories ─────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def category_list_create(request):
    if request.method == 'GET':
        qs = FeeCategory.objects.filter(is_active=True)
        return Response(FeeCategorySerializer(qs, many=True).data)
    serializer = FeeCategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def category_detail(request, pk):
    try:
        obj = FeeCategory.objects.get(pk=pk)
    except FeeCategory.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(FeeCategorySerializer(obj).data)
    if request.method == 'PATCH':
        s = FeeCategorySerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    obj.is_active = False
    obj.save(update_fields=['is_active'])
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Fee Structures ─────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAdmin])
def structure_list_create(request):
    if request.method == 'GET':
        qs = FeeStructure.objects.select_related('class_group', 'academic_year', 'category')
        year_id = request.query_params.get('academic_year')
        class_id = request.query_params.get('class_group')
        if year_id:
            qs = qs.filter(academic_year_id=year_id)
        if class_id:
            qs = qs.filter(class_group_id=class_id)
        return Response(FeeStructureSerializer(qs, many=True).data)
    serializer = FeeStructureSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def structure_detail(request, pk):
    try:
        obj = FeeStructure.objects.select_related('class_group', 'academic_year', 'category').get(pk=pk)
    except FeeStructure.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(FeeStructureSerializer(obj).data)
    if request.method == 'PATCH':
        s = FeeStructureSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)
    obj.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Bulk assign fees to enrolled students ─────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAdmin])
def bulk_assign_fees(request):
    """
    Assign all fee structures for a class+year to every enrolled student in
    that class for that year. Skips already-assigned fees (idempotent).
    """
    s = BulkAssignFeesSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

    class_id = s.validated_data['class_group']
    year_id = s.validated_data['academic_year']

    structures = FeeStructure.objects.filter(class_group_id=class_id, academic_year_id=year_id)
    if not structures.exists():
        return Response({'error': 'No fee structures found for this class and year.'}, status=status.HTTP_400_BAD_REQUEST)

    from apps.students.models import Enrollment
    enrollments = Enrollment.objects.filter(
        section__class_group_id=class_id,
        academic_year_id=year_id,
        status='active',
    ).select_related('student')

    created_count = 0
    with transaction.atomic():
        for enrollment in enrollments:
            for structure in structures:
                _, created = StudentFee.objects.get_or_create(
                    student=enrollment.student,
                    fee_structure=structure,
                    defaults={'amount_due': structure.amount},
                )
                if created:
                    created_count += 1

    return Response({'created': created_count, 'message': f'{created_count} fee records created.'})


# ── Student Fees ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def student_fee_list(request):
    qs = StudentFee.objects.select_related(
        'student__user', 'fee_structure__category',
        'fee_structure__class_group', 'fee_structure__academic_year',
    ).prefetch_related('payments')

    student_id = request.query_params.get('student')
    year_id = request.query_params.get('academic_year')
    class_id = request.query_params.get('class_group')
    fee_status = request.query_params.get('status')

    if student_id:
        qs = qs.filter(student_id=student_id)
    if year_id:
        qs = qs.filter(fee_structure__academic_year_id=year_id)
    if class_id:
        qs = qs.filter(fee_structure__class_group_id=class_id)
    if fee_status:
        qs = qs.filter(status=fee_status)

    return Response(StudentFeeSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def student_fee_detail(request, pk):
    try:
        obj = StudentFee.objects.select_related(
            'student__user', 'fee_structure__category',
            'fee_structure__class_group', 'fee_structure__academic_year',
        ).prefetch_related('payments').get(pk=pk)
    except StudentFee.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(StudentFeeSerializer(obj).data)


# ── Record a payment ──────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAdmin])
def record_payment(request, student_fee_id):
    try:
        student_fee = StudentFee.objects.select_for_update().prefetch_related('payments').get(pk=student_fee_id)
    except StudentFee.DoesNotExist:
        return Response({'error': 'StudentFee not found.'}, status=status.HTTP_404_NOT_FOUND)

    s = RecordPaymentSerializer(data=request.data)
    if not s.is_valid():
        return Response(s.errors, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        receipt_number = _generate_receipt_number()
        payment = FeePayment.objects.create(
            student_fee=student_fee,
            receipt_number=receipt_number,
            **s.validated_data,
        )
        # Refresh to get updated payments sum
        student_fee.refresh_from_db()
        paid = float(student_fee.amount_paid)
        net = float(student_fee.net_amount)
        if paid >= net:
            student_fee.status = StudentFee.Status.PAID
        elif paid > 0:
            student_fee.status = StudentFee.Status.PARTIAL
        student_fee.save(update_fields=['status'])

    return Response(FeePaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


# ── Defaulters list ───────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def defaulters(request):
    """Students with pending/partial fees for a given year."""
    year_id = request.query_params.get('academic_year')
    qs = StudentFee.objects.filter(
        status__in=['pending', 'partial']
    ).select_related(
        'student__user', 'fee_structure__category',
        'fee_structure__class_group', 'fee_structure__academic_year',
    ).prefetch_related('payments')

    if year_id:
        qs = qs.filter(fee_structure__academic_year_id=year_id)

    return Response(StudentFeeSerializer(qs, many=True).data)


# ── Collection report ─────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdmin])
def collection_report(request):
    """Total collected per category for a year."""
    year_id = request.query_params.get('academic_year')
    qs = FeePayment.objects.select_related(
        'student_fee__fee_structure__category',
        'student_fee__fee_structure__academic_year',
    )
    if year_id:
        qs = qs.filter(student_fee__fee_structure__academic_year_id=year_id)

    from django.db.models import Sum
    report = (
        qs.values(
            category=F('student_fee__fee_structure__category__name')
        ).annotate(total_collected=Sum('amount_paid'))
        .order_by('category')
    )

    return Response(list(report))


# ── Helpers ────────────────────────────────────────────────────────────────────

def _generate_receipt_number():
    year = timezone.now().year
    last = (
        FeePayment.objects
        .filter(receipt_number__startswith=f"RCP{year}")
        .order_by('-receipt_number')
        .first()
    )
    if last:
        try:
            seq = int(last.receipt_number.split('-')[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f"RCP{year}-{seq:05d}"
