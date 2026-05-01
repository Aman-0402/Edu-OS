from django.urls import path
from .views import (
    admin_kpis,
    attendance_trend,
    fee_collection_trend,
    student_strength,
    fee_category_breakdown,
    export_attendance_csv,
    export_fees_csv,
)

urlpatterns = [
    path('kpis/', admin_kpis),
    path('attendance-trend/', attendance_trend),
    path('fee-trend/', fee_collection_trend),
    path('student-strength/', student_strength),
    path('fee-categories/', fee_category_breakdown),
    path('export/attendance/', export_attendance_csv),
    path('export/fees/', export_fees_csv),
]
