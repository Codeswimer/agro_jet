"""Root URL configuration: /api/ (DRF) + Django admin."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def health(_request):
    return JsonResponse({'status': 'ok', 'service': 'agrojet-backend'})


urlpatterns = [
    path('health', health, name='health'),
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('marketplace.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
]
