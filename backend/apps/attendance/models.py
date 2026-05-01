from django.db import models
from django.conf import settings


class AttendanceSession(models.Model):
    section = models.ForeignKey(
        'academics.Section',
        on_delete=models.CASCADE,
        related_name='attendance_sessions',
    )
    date = models.DateField()
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='marked_sessions',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'attendance_sessions'
        unique_together = [('section', 'date')]
        ordering = ['-date']

    def __str__(self):
        return f"{self.section} — {self.date}"


class AttendanceRecord(models.Model):
    class Status(models.TextChoices):
        PRESENT = 'P', 'Present'
        ABSENT = 'A', 'Absent'
        LATE = 'L', 'Late'
        HALF_DAY = 'H', 'Half Day'
        HOLIDAY = 'HO', 'Holiday'
        EXCUSED = 'E', 'Excused'

    session = models.ForeignKey(
        AttendanceSession,
        on_delete=models.CASCADE,
        related_name='records',
    )
    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.CASCADE,
        related_name='attendance_records',
    )
    status = models.CharField(max_length=2, choices=Status.choices, default=Status.PRESENT)
    remarks = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'attendance_records'
        unique_together = [('session', 'student')]

    def __str__(self):
        return f"{self.student} — {self.session.date} — {self.status}"
