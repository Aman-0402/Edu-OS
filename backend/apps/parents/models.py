from django.db import models
from django.conf import settings


class ParentProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='parent_profile',
    )
    occupation = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'parent_profiles'

    def __str__(self):
        return self.user.get_full_name()


class ParentStudentLink(models.Model):
    class Relationship(models.TextChoices):
        FATHER = 'father', 'Father'
        MOTHER = 'mother', 'Mother'
        GUARDIAN = 'guardian', 'Guardian'
        OTHER = 'other', 'Other'

    parent = models.ForeignKey(
        ParentProfile,
        on_delete=models.CASCADE,
        related_name='children_links',
    )
    student = models.ForeignKey(
        'students.StudentProfile',
        on_delete=models.CASCADE,
        related_name='parent_links',
    )
    relationship = models.CharField(
        max_length=20,
        choices=Relationship.choices,
        default=Relationship.GUARDIAN,
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'parent_student_links'
        unique_together = [('parent', 'student')]

    def __str__(self):
        return f"{self.parent} → {self.student} ({self.relationship})"
