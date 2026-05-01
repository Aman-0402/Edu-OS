from django.urls import path
from .views import (
    bulk_mark_attendance,
    get_session,
    section_students,
    student_summary,
    section_report,
    session_list,
)

urlpatterns = [
    path('mark/', bulk_mark_attendance),
    path('session/', get_session),
    path('sessions/', session_list),
    path('section-students/', section_students),
    path('summary/<int:student_id>/', student_summary),
    path('report/', section_report),
]
