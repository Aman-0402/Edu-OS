from rest_framework import serializers
from .models import FeeCategory, FeeStructure, StudentFee, FeePayment


class FeeCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeCategory
        fields = ['id', 'name', 'description', 'is_recurring', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class FeeStructureSerializer(serializers.ModelSerializer):
    class_name = serializers.ReadOnlyField(source='class_group.name')
    academic_year_name = serializers.ReadOnlyField(source='academic_year.name')
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = FeeStructure
        fields = [
            'id', 'class_group', 'class_name',
            'academic_year', 'academic_year_name',
            'category', 'category_name',
            'amount', 'due_date', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class FeePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeePayment
        fields = [
            'id', 'student_fee', 'amount_paid', 'payment_date',
            'method', 'receipt_number', 'remarks', 'created_at',
        ]
        read_only_fields = ['id', 'receipt_number', 'created_at']


class StudentFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.user.get_full_name')
    admission_number = serializers.ReadOnlyField(source='student.admission_number')
    category_name = serializers.ReadOnlyField(source='fee_structure.category.name')
    class_name = serializers.ReadOnlyField(source='fee_structure.class_group.name')
    academic_year_name = serializers.ReadOnlyField(source='fee_structure.academic_year.name')
    due_date = serializers.ReadOnlyField(source='fee_structure.due_date')
    net_amount = serializers.ReadOnlyField()
    amount_paid = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    payments = FeePaymentSerializer(many=True, read_only=True)

    class Meta:
        model = StudentFee
        fields = [
            'id', 'student', 'student_name', 'admission_number',
            'fee_structure', 'category_name', 'class_name', 'academic_year_name',
            'due_date', 'amount_due', 'discount', 'net_amount',
            'amount_paid', 'balance', 'status', 'payments',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']

    def get_amount_paid(self, obj):
        return float(obj.amount_paid)

    def get_balance(self, obj):
        return float(obj.balance)


class RecordPaymentSerializer(serializers.Serializer):
    amount_paid = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_date = serializers.DateField()
    method = serializers.ChoiceField(choices=FeePayment.Method.choices, default='cash')
    remarks = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_amount_paid(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value


class BulkAssignFeesSerializer(serializers.Serializer):
    """Assign all fee structures of a class+year to all enrolled students."""
    class_group = serializers.IntegerField()
    academic_year = serializers.IntegerField()
