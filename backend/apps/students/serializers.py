from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import User
from apps.academics.models import Section, AcademicYear
from .models import StudentProfile, Enrollment, StudentApplication


class StudentUserSerializer(serializers.ModelSerializer):
    """Nested user fields used when creating a student."""
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'phone', 'password']


class StudentProfileSerializer(serializers.ModelSerializer):
    # User fields (read)
    email = serializers.ReadOnlyField(source='user.email')
    first_name = serializers.ReadOnlyField(source='user.first_name')
    last_name = serializers.ReadOnlyField(source='user.last_name')
    full_name = serializers.ReadOnlyField(source='user.full_name')
    phone = serializers.ReadOnlyField(source='user.phone')
    user_id = serializers.ReadOnlyField(source='user.id')

    class Meta:
        model = StudentProfile
        fields = [
            'id', 'user_id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
            'admission_number', 'date_of_birth', 'gender', 'address',
            'photo', 'blood_group',
            'father_name', 'mother_name',
            'guardian_name', 'guardian_phone', 'guardian_relation',
            'guardian_occupation', 'guardian_salary_range',
            'is_active', 'created_at',
        ]
        read_only_fields = ['id', 'admission_number', 'created_at']


class StudentCreateSerializer(serializers.Serializer):
    """Creates User (role=student) + StudentProfile in one call."""
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(
        choices=StudentProfile.Gender.choices, required=False, allow_blank=True
    )
    address = serializers.CharField(required=False, allow_blank=True)
    blood_group = serializers.CharField(max_length=5, required=False, allow_blank=True)
    father_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    mother_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    guardian_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    guardian_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    guardian_relation = serializers.CharField(max_length=50, required=False, allow_blank=True)
    guardian_occupation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    guardian_salary_range = serializers.CharField(max_length=50, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
        user_fields = ['email', 'first_name', 'last_name', 'phone', 'password']
        user_data = {k: validated_data.pop(k) for k in user_fields if k in validated_data}
        password = user_data.pop('password')

        user = User(role=User.Role.STUDENT, username=user_data['email'], **user_data)
        user.set_password(password)
        user.save()

        admission_number = _generate_admission_number()
        profile = StudentProfile.objects.create(
            user=user,
            admission_number=admission_number,
            **validated_data,
        )
        return profile


class StudentUpdateSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    class Meta:
        model = StudentProfile
        fields = [
            'first_name', 'last_name', 'phone',
            'date_of_birth', 'gender', 'address',
            'blood_group', 'father_name', 'mother_name',
            'guardian_name', 'guardian_phone', 'guardian_relation',
            'guardian_occupation', 'guardian_salary_range', 'is_active',
        ]

    def update(self, instance, validated_data):
        user_fields = ['first_name', 'last_name', 'phone']
        user_data = {k: validated_data.pop(k) for k in user_fields if k in validated_data}
        if user_data:
            for attr, val in user_data.items():
                setattr(instance.user, attr, val)
            instance.user.save(update_fields=list(user_data.keys()))
        return super().update(instance, validated_data)


# ── Enrollment ────────────────────────────────────────────────────────────────

class EnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.user.get_full_name')
    admission_number = serializers.ReadOnlyField(source='student.admission_number')
    section_name = serializers.ReadOnlyField(source='section.name')
    class_name = serializers.ReadOnlyField(source='section.class_group.name')
    academic_year_name = serializers.ReadOnlyField(source='academic_year.name')

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'student_name', 'admission_number',
            'section', 'section_name', 'class_name',
            'academic_year', 'academic_year_name',
            'status', 'enrolled_on',
        ]
        read_only_fields = ['id', 'enrolled_on']

    def validate(self, attrs):
        student = attrs.get('student', getattr(self.instance, 'student', None))
        year = attrs.get('academic_year', getattr(self.instance, 'academic_year', None))
        section = attrs.get('section', getattr(self.instance, 'section', None))

        # Section must belong to the academic year
        if section and year and section.academic_year_id != year.id:
            raise serializers.ValidationError(
                {'section': 'Section does not belong to the selected academic year.'}
            )

        # Check unique_together (skip for update of same instance)
        qs = Enrollment.objects.filter(student=student, academic_year=year)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'This student is already enrolled for the selected academic year.'
            )
        return attrs


# ── Student Applications ──────────────────────────────────────────────────────

class StudentApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentApplication
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone',
            'date_of_birth', 'gender', 'address', 'blood_group',
            'father_name', 'father_occupation', 'father_salary_range',
            'mother_name', 'mother_occupation', 'mother_salary_range',
            'guardian_name', 'guardian_phone', 'guardian_relation',
            'status', 'rejection_reason', 'reviewed_at', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'rejection_reason', 'reviewed_at', 'created_at']


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_admission_number():
    from django.utils import timezone
    year = timezone.now().year
    last = (
        StudentProfile.objects
        .filter(admission_number__startswith=str(year))
        .order_by('-admission_number')
        .first()
    )
    if last:
        try:
            seq = int(last.admission_number.split('-')[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f"{year}-{seq:04d}"
