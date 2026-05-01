from rest_framework import serializers
from .models import AttendanceSession, AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.user.get_full_name')
    admission_number = serializers.ReadOnlyField(source='student.admission_number')

    class Meta:
        model = AttendanceRecord
        fields = ['id', 'student', 'student_name', 'admission_number', 'status', 'remarks']


class AttendanceSessionSerializer(serializers.ModelSerializer):
    section_name = serializers.SerializerMethodField()
    class_name = serializers.ReadOnlyField(source='section.class_group.name')
    marked_by_name = serializers.ReadOnlyField(source='marked_by.get_full_name')
    records = AttendanceRecordSerializer(many=True, read_only=True)

    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'section', 'section_name', 'class_name',
            'date', 'marked_by', 'marked_by_name',
            'records', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'marked_by', 'created_at', 'updated_at']

    def get_section_name(self, obj):
        return f"{obj.section.class_group.name} - {obj.section.name}"


class BulkAttendanceRecordInput(serializers.Serializer):
    student = serializers.IntegerField()
    status = serializers.ChoiceField(choices=AttendanceRecord.Status.choices)
    remarks = serializers.CharField(required=False, allow_blank=True, default='')


class BulkMarkAttendanceSerializer(serializers.Serializer):
    section = serializers.IntegerField()
    date = serializers.DateField()
    records = BulkAttendanceRecordInput(many=True)

    def validate_records(self, value):
        if not value:
            raise serializers.ValidationError('At least one record is required.')
        return value


# ── Summary / Report serializers (read-only) ─────────────────────────────────

class StudentAttendanceSummarySerializer(serializers.Serializer):
    """Monthly breakdown for one student."""
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    admission_number = serializers.CharField()
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    total_days = serializers.IntegerField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    half_day = serializers.IntegerField()
    excused = serializers.IntegerField()
    percentage = serializers.FloatField()


class SectionAttendanceReportSerializer(serializers.Serializer):
    """Per-student totals across a date range for one section."""
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    admission_number = serializers.CharField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    half_day = serializers.IntegerField()
    excused = serializers.IntegerField()
    total_days = serializers.IntegerField()
    percentage = serializers.FloatField()
