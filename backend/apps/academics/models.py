from django.db import models
from django.conf import settings


class AcademicYear(models.Model):
    name = models.CharField(max_length=20, unique=True)  # e.g. "2025-2026"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academic_years'
        ordering = ['-start_date']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        # Enforce single current year
        if self.is_current:
            AcademicYear.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)


class Class(models.Model):
    name = models.CharField(max_length=50)
    numeric_value = models.PositiveSmallIntegerField()  # 1-12, used for ordering
    description = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'classes'
        ordering = ['numeric_value']
        verbose_name = 'Class'
        verbose_name_plural = 'Classes'

    def __str__(self):
        return self.name


class Section(models.Model):
    class_group = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='sections')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=5)  # "A", "B", "C"
    class_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='class_teacher_sections',
        limit_choices_to={'role': 'teacher'},
    )
    capacity = models.PositiveSmallIntegerField(default=40)

    class Meta:
        db_table = 'sections'
        unique_together = ('class_group', 'academic_year', 'name')
        ordering = ['class_group__numeric_value', 'name']

    def __str__(self):
        return f"{self.class_group.name} - {self.name} ({self.academic_year.name})"


class Subject(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    class_group = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='subjects')

    class Meta:
        db_table = 'subjects'
        unique_together = ('code', 'class_group')
        ordering = ['class_group__numeric_value', 'name']

    def __str__(self):
        return f"{self.name} ({self.class_group.name})"
