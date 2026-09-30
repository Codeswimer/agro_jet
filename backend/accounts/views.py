"""Authentication, profile and KYC endpoints."""
import django_filters
from django.contrib.auth import get_user_model
from rest_framework import filters, generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    AgroJetTokenObtainPairSerializer,
    BvnVerifySerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Public endpoint: create a farmer or buyer account."""

    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserProfileSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """Public endpoint: exchange email + password for a JWT pair."""

    permission_classes = [permissions.AllowAny]
    serializer_class = AgroJetTokenObtainPairSerializer


class MeView(generics.RetrieveUpdateAPIView):
    """Current user profile (GET) and partial profile update (PATCH)."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return ProfileUpdateSerializer
        return UserProfileSerializer


class BvnVerifyView(generics.GenericAPIView):
    """Verify an 11-digit BVN against the BMONI NIBSS sandbox and set KYC tier."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BvnVerifySerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bvn = serializer.validated_data['bvn']
        record = BvnVerifySerializer.BVN_REGISTRY[bvn]

        request.user.bvn = bvn
        request.user.bvn_verified = True
        request.user.kyc_tier = 2
        request.user.save(update_fields=['bvn', 'bvn_verified', 'kyc_tier'])

        return Response({
            'status': 'VERIFIED',
            'kyc_tier': request.user.kyc_tier,
            'bvn_record': record,
        })


class UserListAdminView(generics.ListAPIView):
    """Admin-only user directory with search and role filtering."""

    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserProfileSerializer
    queryset = User.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, django_filters.rest_framework.DjangoFilterBackend]
    search_fields = ['email', 'first_name', 'last_name', 'bvn']
    ordering_fields = ['date_joined', 'email', 'role']
    filterset_fields = ['role', 'bvn_verified', 'is_active']
