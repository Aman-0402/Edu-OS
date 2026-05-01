from rest_framework import serializers
from .models import AcademicYear, Class, Section, Subject


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_current', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, attrs):
        start = attrs.get('start_date', getattr(self.instance, 'start_date', None))
        end = attrs.get('end_date', getattr(self.instance, 'end_date', None))
        if start and end and start >= end:
            raise serializers.ValidationError({'end_date': 'End date must be after start date.'})
        return attrs


class ClassSerializer(serializers.ModelSerializer):
    class Meta:
        model = Class
        fields = ['id', 'name', 'numeric_value', 'description']
        read_only_fields = ['id']


class SubjectSerializer(serializers.ModelSerializer):
    class_group_name = serializers.ReadOnlyField(source='class_group.name')

    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'class_group', 'class_group_name']
        read_only_fields = ['id', 'class_group_name']


class SectionSerializer(serializers.ModelSerializer):
    class_group_name = serializers.ReadOnlyField(source='class_group.name')
    academic_year_name = serializers.ReadOnlyField(source='academic_year.name')
    class_teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = [
            'id', 'class_group', 'class_group_name',
            'academic_year', 'academic_year_name',
            'name', 'class_teacher', 'class_teacher_name', 'capacity',
        ]
        read_only_fields = ['id', 'class_group_name', 'academic_year_name', 'class_teacher_name']

    def get_class_teacher_name(self, obj):
        if obj.class_teacher:
            return obj.class_teacher.get_full_name()
        return None


class SectionAssignTeacherSerializer(serializers.Serializer):
    class_teacher_id = serializers.IntegerField(allow_null=True)

    def validate_class_teacher_id(self, value):
        if value is None:
            return value
        from apps.accounts.models import User
        try:
            user = User.objects.get(pk=value, role='teacher', is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError('No active teacher found with this ID.')
        return value
