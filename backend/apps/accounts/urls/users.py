from django.urls import path

from apps.accounts.views.user_views import user_list_create_view, user_detail_view

urlpatterns = [
    path('', user_list_create_view, name='user-list-create'),
    path('<int:pk>/', user_detail_view, name='user-detail'),
]
