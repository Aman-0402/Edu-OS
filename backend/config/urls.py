from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'success': True, 'message': 'EduOS API is running'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/auth/', include('apps.accounts.urls.auth')),
    path('api/users/', include('apps.accounts.urls.users')),
    path('api/academics/', include('apps.academics.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/teachers/', include('apps.teachers.urls')),
    path('api/attendance/', include('apps.attendance.urls')),
    path('api/fees/', include('apps.fees.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
