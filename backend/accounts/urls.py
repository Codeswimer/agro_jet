from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    BvnVerifyView,
    LoginView,
    MeView,
    RegisterView,
    UserListAdminView,
)

app_name = 'accounts'

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('kyc/bvn-verify/', BvnVerifyView.as_view(), name='bvn-verify'),
    path('admin-panel/users/', UserListAdminView.as_view(), name='admin-users'),
]
