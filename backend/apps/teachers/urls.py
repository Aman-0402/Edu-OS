from django.urls import path
from .views import (
    teacher_list_create,
    teacher_detail,
    assignment_list_create,
    assignment_detail,
    announcement_list_create,
    announcement_detail,
)

urlpatterns = [
    path('', teacher_list_create),
    path('<int:pk>/', teacher_detail),
    path('assignments/', assignment_list_create),
    path('assignments/<int:pk>/', assignment_detail),
    path('announcements/', announcement_list_create),
    path('announcements/<int:pk>/', announcement_detail),
]
