from django.urls import path
from .views import (
    parent_list_create, parent_detail,
    link_list_create, link_detail,
    my_children, child_attendance, child_fees, child_announcements,
)

urlpatterns = [
    # Admin
    path('', parent_list_create),
    path('<int:pk>/', parent_detail),
    path('links/', link_list_create),
    path('links/<int:pk>/', link_detail),
    # Parent portal
    path('my-children/', my_children),
    path('child/<int:student_id>/attendance/', child_attendance),
    path('child/<int:student_id>/fees/', child_fees),
    path('child/<int:student_id>/announcements/', child_announcements),
]
