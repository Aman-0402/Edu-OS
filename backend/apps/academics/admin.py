from django.contrib import admin
from .models import AcademicYear, Class, Section, Subject


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'is_current')
    list_filter = ('is_current',)


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ('name', 'numeric_value')
    ordering = ('numeric_value',)


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'class_teacher', 'capacity')
    list_filter = ('academic_year', 'class_group')
    raw_id_fields = ('class_teacher',)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'class_group')
    list_filter = ('class_group',)
