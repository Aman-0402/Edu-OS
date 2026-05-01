from django.db import models
from django.conf import settings


class TeacherProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teacher_profile',
    )
    employee_id = models.CharField(max_length=20, unique=True)
    qualification = models.CharField(max_length=200, blank=True)
    specialization = models.CharField(max_length=200, blank=True)
    joining_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teacher_profiles'

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.employee_id})"


class TeacherAssignment(models.Model):
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name='assignments',
    )
    section = models.ForeignKey(
        'academics.Section',
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
    )
    subject = models.ForeignKey(
        'academics.Subject',
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
    )
    academic_year = models.ForeignKey(
        'academics.AcademicYear',
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'teacher_assignments'
        unique_together = [('teacher', 'section', 'subject', 'academic_year')]

    def __str__(self):
        return f"{self.teacher} — {self.subject} ({self.section})"


class Announcement(models.Model):
    class Audience(models.TextChoices):
        ALL = 'all', 'All'
        STUDENTS = 'students', 'Students'
        PARENTS = 'parents', 'Parents'
        TEACHERS = 'teachers', 'Teachers'

    title = models.CharField(max_length=200)
    content = models.TextField()
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='announcements',
    )
    target_audience = models.CharField(
        max_length=20,
        choices=Audience.choices,
        default=Audience.ALL,
    )
    # Optional: target a specific class (null = school-wide)
    target_class = models.ForeignKey(
        'academics.Class',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']

    def __str__(self):
        return self.title
