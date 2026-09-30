"""Root URL configuration: /api/ (DRF) + Django admin."""
from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(_request):
    return JsonResponse({'status': 'ok', 'service': 'agrojet-backend'})


def root(_request):
    """The SPA lives on Vite (:5173) locally / at the site root on Vercel.
    Redirect there instead of showing a bare 404 when someone hits the API
    root directly."""
    return redirect('http://localhost:5173' if settings.DEBUG else '/')


urlpatterns = [
    path('', root, name='root'),
    path('health', health, name='health'),
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('marketplace.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
]
