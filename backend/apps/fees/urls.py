from django.urls import path
from .views import (
    category_list_create, category_detail,
    structure_list_create, structure_detail,
    bulk_assign_fees,
    student_fee_list, student_fee_detail,
    record_payment,
    defaulters,
    collection_report,
)

urlpatterns = [
    path('categories/', category_list_create),
    path('categories/<int:pk>/', category_detail),
    path('structures/', structure_list_create),
    path('structures/<int:pk>/', structure_detail),
    path('assign/', bulk_assign_fees),
    path('student-fees/', student_fee_list),
    path('student-fees/<int:pk>/', student_fee_detail),
    path('student-fees/<int:student_fee_id>/pay/', record_payment),
    path('defaulters/', defaulters),
    path('collection-report/', collection_report),
]
