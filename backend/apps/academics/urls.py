from django.urls import path
from . import views

urlpatterns = [
    # Academic Years
    path('years/', views.academic_year_list_create, name='year-list-create'),
    path('years/current/', views.current_academic_year, name='year-current'),
    path('years/<int:pk>/', views.academic_year_detail, name='year-detail'),

    # Classes
    path('classes/', views.class_list_create, name='class-list-create'),
    path('classes/<int:pk>/', views.class_detail, name='class-detail'),

    # Sections
    path('sections/', views.section_list_create, name='section-list-create'),
    path('sections/<int:pk>/', views.section_detail, name='section-detail'),
    path('sections/<int:pk>/assign-teacher/', views.section_assign_teacher, name='section-assign-teacher'),

    # Subjects
    path('subjects/', views.subject_list_create, name='subject-list-create'),
    path('subjects/<int:pk>/', views.subject_detail, name='subject-detail'),
]
