from django.urls import path
from .views import (
    student_list_create,
    student_detail,
    student_me,
    enrollment_list_create,
    enrollment_detail,
)

urlpatterns = [
    path('', student_list_create),
    path('me/', student_me),
    path('<int:pk>/', student_detail),
    path('enrollments/', enrollment_list_create),
    path('enrollments/<int:pk>/', enrollment_detail),
]
