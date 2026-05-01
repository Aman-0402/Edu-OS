from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import User
from .models import ParentProfile, ParentStudentLink


class ParentProfileSerializer(serializers.ModelSerializer):
    email = serializers.ReadOnlyField(source='user.email')
    full_name = serializers.ReadOnlyField(source='user.full_name')
    phone = serializers.ReadOnlyField(source='user.phone')
    user_id = serializers.ReadOnlyField(source='user.id')

    class Meta:
        model = ParentProfile
        fields = ['id', 'user_id', 'email', 'full_name', 'phone',
                  'occupation', 'address', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class ParentCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        user_fields = ['email', 'first_name', 'last_name', 'phone', 'password']
        user_data = {k: validated_data.pop(k) for k in user_fields if k in validated_data}
        password = user_data.pop('password')
        user = User(role=User.Role.PARENT, username=user_data['email'], **user_data)
        user.set_password(password)
        user.save()
        return ParentProfile.objects.create(user=user, **validated_data)


class ParentStudentLinkSerializer(serializers.ModelSerializer):
    parent_name = serializers.ReadOnlyField(source='parent.user.get_full_name')
    student_name = serializers.ReadOnlyField(source='student.user.get_full_name')
    admission_number = serializers.ReadOnlyField(source='student.admission_number')
    student_id = serializers.ReadOnlyField(source='student.id')

    class Meta:
        model = ParentStudentLink
        fields = ['id', 'parent', 'parent_name', 'student', 'student_id',
                  'student_name', 'admission_number', 'relationship', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChildSummarySerializer(serializers.Serializer):
    """Lightweight child card shown in parent dashboard."""
    student_id = serializers.IntegerField()
    full_name = serializers.CharField()
    admission_number = serializers.CharField()
    relationship = serializers.CharField()
    current_class = serializers.CharField(allow_null=True)
    current_section = serializers.CharField(allow_null=True)
