from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views.auth_views import (
    LoginView,
    logout_view,
    profile_view,
    change_password_view,
    password_reset_request_view,
    password_reset_confirm_view,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', logout_view, name='auth-logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', profile_view, name='auth-profile'),
    path('change-password/', change_password_view, name='auth-change-password'),
    path('password-reset/', password_reset_request_view, name='password-reset-request'),
    path('password-reset/confirm/', password_reset_confirm_view, name='password-reset-confirm'),
]
