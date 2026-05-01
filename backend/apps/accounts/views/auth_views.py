from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from django.conf import settings

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from apps.accounts.models import User
from apps.accounts.serializers import (
    CustomTokenObtainPairSerializer,
    UserProfileSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)

REFRESH_COOKIE = 'refresh_token'
REFRESH_COOKIE_PATH = '/api/auth/'
REFRESH_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


def _set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=REFRESH_MAX_AGE,
        httponly=True,
        secure=getattr(settings, 'REFRESH_TOKEN_COOKIE_SECURE', False),
        samesite='Lax',
        path=REFRESH_COOKIE_PATH,
    )


def _delete_refresh_cookie(response):
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH)


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            refresh_token = response.data.pop('refresh', None)
            if refresh_token:
                _set_refresh_cookie(response, refresh_token)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Reads refresh token from httpOnly cookie instead of request body."""

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE)
        if not refresh_token:
            return Response(
                {'error': 'No refresh token cookie present.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build the serializer directly with the cookie value — avoids mutating request.data
        serializer = self.get_serializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            resp = Response({'detail': str(e)}, status=status.HTTP_401_UNAUTHORIZED)
            _delete_refresh_cookie(resp)
            return resp
        except InvalidToken as e:
            resp = Response(e.detail, status=status.HTTP_401_UNAUTHORIZED)
            _delete_refresh_cookie(resp)
            return resp

        data = dict(serializer.validated_data)
        # ROTATE_REFRESH_TOKENS=True → new refresh token in response; move it to cookie
        new_refresh = data.pop('refresh', None)
        response = Response(data, status=status.HTTP_200_OK)
        if new_refresh:
            _set_refresh_cookie(response, new_refresh)
        return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    refresh_token = request.COOKIES.get(REFRESH_COOKIE) or request.data.get('refresh')
    response = Response({'message': 'Logged out successfully.'}, status=status.HTTP_200_OK)
    _delete_refresh_cookie(response)
    if refresh_token:
        try:
            RefreshToken(refresh_token).blacklist()
        except Exception:
            pass  # already expired / invalid — still clear the cookie
    return response


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    if request.method == 'GET':
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password_view(request):
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'message': 'Password changed successfully.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    email = serializer.validated_data['email']
    try:
        user = User.objects.get(email=email, is_active=True)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"http://localhost:3000/reset-password/{uid}/{token}/"

        send_mail(
            subject='EduOS — Password Reset Request',
            message=f'Click the link to reset your password: {reset_url}',
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@eduos.com'),
            recipient_list=[email],
            fail_silently=False,
        )
    except User.DoesNotExist:
        pass  # Don't reveal whether the email exists

    return Response({'message': 'If the email is registered, a reset link has been sent.'})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(serializer.validated_data['uid']))
        user = User.objects.get(pk=uid)
    except (User.DoesNotExist, ValueError, TypeError):
        return Response({'error': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, serializer.validated_data['token']):
        return Response({'error': 'Reset link has expired or is invalid.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(serializer.validated_data['new_password'])
    user.save()
    return Response({'message': 'Password has been reset successfully.'})
