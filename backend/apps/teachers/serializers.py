from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import User
from .models import TeacherProfile, TeacherAssignment, Announcement


class TeacherProfileSerializer(serializers.ModelSerializer):
    email = serializers.ReadOnlyField(source='user.email')
    first_name = serializers.ReadOnlyField(source='user.first_name')
    last_name = serializers.ReadOnlyField(source='user.last_name')
    full_name = serializers.ReadOnlyField(source='user.full_name')
    phone = serializers.ReadOnlyField(source='user.phone')
    user_id = serializers.ReadOnlyField(source='user.id')

    class Meta:
        model = TeacherProfile
        fields = [
            'id', 'user_id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
            'employee_id', 'qualification', 'specialization', 'joining_date',
            'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'employee_id', 'created_at']


class TeacherCreateSerializer(serializers.Serializer):
    """Creates User (role=teacher) + TeacherProfile in one call."""
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    qualification = serializers.CharField(max_length=200, required=False, allow_blank=True)
    specialization = serializers.CharField(max_length=200, required=False, allow_blank=True)
    joining_date = serializers.DateField(required=False, allow_null=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        user_fields = ['email', 'first_name', 'last_name', 'phone', 'password']
        user_data = {k: validated_data.pop(k) for k in user_fields if k in validated_data}
        password = user_data.pop('password')

        user = User(role=User.Role.TEACHER, username=user_data['email'], **user_data)
        user.set_password(password)
        user.save()

        employee_id = _generate_employee_id()
        profile = TeacherProfile.objects.create(
            user=user,
            employee_id=employee_id,
            **validated_data,
        )
        return profile


class TeacherUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    class Meta:
        model = TeacherProfile
        fields = [
            'first_name', 'last_name', 'phone',
            'qualification', 'specialization', 'joining_date', 'is_active',
        ]

    def update(self, instance, validated_data):
        user_fields = ['first_name', 'last_name', 'phone']
        user_data = {k: validated_data.pop(k) for k in user_fields if k in validated_data}
        if user_data:
            for attr, val in user_data.items():
                setattr(instance.user, attr, val)
            instance.user.save(update_fields=list(user_data.keys()))
        return super().update(instance, validated_data)


# ── Teacher Assignments ───────────────────────────────────────────────────────

class TeacherAssignmentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.ReadOnlyField(source='teacher.user.get_full_name')
    employee_id = serializers.ReadOnlyField(source='teacher.employee_id')
    section_name = serializers.SerializerMethodField()
    subject_name = serializers.ReadOnlyField(source='subject.name')
    subject_code = serializers.ReadOnlyField(source='subject.code')
    academic_year_name = serializers.ReadOnlyField(source='academic_year.name')

    class Meta:
        model = TeacherAssignment
        fields = [
            'id', 'teacher', 'teacher_name', 'employee_id',
            'section', 'section_name',
            'subject', 'subject_name', 'subject_code',
            'academic_year', 'academic_year_name',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_section_name(self, obj):
        return f"{obj.section.class_group.name} - {obj.section.name}"

    def validate(self, attrs):
        section = attrs.get('section', getattr(self.instance, 'section', None))
        subject = attrs.get('subject', getattr(self.instance, 'subject', None))
        year = attrs.get('academic_year', getattr(self.instance, 'academic_year', None))

        if section and subject and section.class_group_id != subject.class_group_id:
            raise serializers.ValidationError(
                {'subject': 'Subject does not belong to the same class as the section.'}
            )
        if section and year and section.academic_year_id != year.id:
            raise serializers.ValidationError(
                {'section': 'Section does not belong to the selected academic year.'}
            )
        return attrs


# ── Announcements ─────────────────────────────────────────────────────────────

class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.ReadOnlyField(source='posted_by.get_full_name')
    target_class_name = serializers.ReadOnlyField(source='target_class.name')

    class Meta:
        model = Announcement
        fields = [
            'id', 'title', 'content',
            'posted_by', 'posted_by_name',
            'target_audience', 'target_class', 'target_class_name',
            'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'posted_by', 'created_at', 'updated_at']


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_employee_id():
    from django.utils import timezone
    year = timezone.now().year
    last = (
        TeacherProfile.objects
        .filter(employee_id__startswith=f"T{year}")
        .order_by('-employee_id')
        .first()
    )
    if last:
        try:
            seq = int(last.employee_id.split('-')[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f"T{year}-{seq:04d}"
