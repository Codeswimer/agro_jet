"""Marketplace API views: catalog, wallet, payments, escrow, admin dashboard."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import DecimalField, Q, Sum
from django.db.models.functions import Coalesce
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.serializers import UserProfileSerializer
from .filters import CorporateBuyerFilterSet, ImportPoolFilterSet, ProduceFilterSet
from .models import (
    AgriInput,
    CorporateBuyer,
    EscrowContract,
    ImportPool,
    Payment,
    ProduceListing,
    Wallet,
)
from .serializers import (
    AdminStatsSerializer,
    AgriInputSerializer,
    CorporateBuyerSerializer,
    EscrowContractSerializer,
    ImportPoolSerializer,
    PaymentInitSerializer,
    PaymentSerializer,
    ProduceListingSerializer,
    UserProfileMiniSerializer,
    WalletSerializer,
)
from .services import PaymentError, PaymentService, get_wallet

User = get_user_model()


class IsAdmin(permissions.IsAdminUser):
    """Django is_staff check — used for admin dashboard endpoints."""


# ---------------------------------------------------------------------------
# Catalog (public read)
# ---------------------------------------------------------------------------
class CorporateBuyerListView(generics.ListAPIView):
    queryset = CorporateBuyer.objects.filter(is_active=True)
    serializer_class = CorporateBuyerSerializer
    permission_classes = [permissions.AllowAny]
    filterset_class = CorporateBuyerFilterSet


class ProduceListingListView(generics.ListAPIView):
    queryset = ProduceListing.objects.filter(is_active=True).select_related('seller')
    serializer_class = ProduceListingSerializer
    permission_classes = [permissions.AllowAny]
    filterset_class = ProduceFilterSet


class ProduceListingCreateView(generics.CreateAPIView):
    serializer_class = ProduceListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class AgriInputListView(generics.ListAPIView):
    queryset = AgriInput.objects.filter(is_active=True)
    serializer_class = AgriInputSerializer
    permission_classes = [permissions.AllowAny]


class ImportPoolListView(generics.ListAPIView):
    queryset = ImportPool.objects.filter(is_active=True)
    serializer_class = ImportPoolSerializer
    permission_classes = [permissions.AllowAny]
    filterset_class = ImportPoolFilterSet


# ---------------------------------------------------------------------------
# Wallet
# ---------------------------------------------------------------------------
class WalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(WalletSerializer(get_wallet(request.user)).data)


# ---------------------------------------------------------------------------
# Payments (BMONI sandbox rails)
# ---------------------------------------------------------------------------
class PaymentInitializeView(generics.CreateAPIView):
    """Initialize a checkout session. Returns virtual account details."""

    serializer_class = PaymentInitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payment = PaymentService.initialize(request.user, data)

        return Response(
            {
                'status': 'SUCCESS',
                'payment': PaymentSerializer(payment).data,
                'escrow': EscrowContractSerializer(payment.escrow).data if payment.escrow else None,
                'checkout_url': f'https://checkout.bmoni.com/pay/{payment.reference}',
            },
            status=status.HTTP_201_CREATED,
        )


class PaymentConfirmView(APIView):
    """Sandbox confirmation: debits the wallet and locks escrow funds."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = request.data.get('reference', '')
        try:
            payment = Payment.objects.select_related('escrow').get(
                reference=reference, user=request.user,
            )
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment reference not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            payment = PaymentService.confirm(request.user, payment)
        except (PaymentError, ValueError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'SUCCESS',
            'payment': PaymentSerializer(payment).data,
            'escrow': EscrowContractSerializer(payment.escrow).data if payment.escrow else None,
            'wallet': WalletSerializer(get_wallet(request.user)).data,
        })


class PaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)


# ---------------------------------------------------------------------------
# Escrow
# ---------------------------------------------------------------------------
class EscrowListView(generics.ListAPIView):
    serializer_class = EscrowContractSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = EscrowContract.objects.select_related('buyer', 'corporate_buyer')
        if self.request.user.is_admin_role:
            return qs
        return qs.filter(Q(buyer=self.request.user) | Q(seller_label__icontains=self.request.user.email))


class EscrowReleaseView(APIView):
    """Verify quality and release locked funds to the seller."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            escrow = EscrowContract.objects.get(pk=pk)
        except EscrowContract.DoesNotExist:
            return Response({'detail': 'Escrow contract not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            escrow = PaymentService.release(escrow, request.user)
        except (PaymentError, PermissionError) as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_403_FORBIDDEN)
        return Response(EscrowContractSerializer(escrow).data)


# ---------------------------------------------------------------------------
# Admin dashboard
# ---------------------------------------------------------------------------
class AdminStatsView(APIView):
    """Platform KPIs for the custom admin dashboard."""

    permission_classes = [IsAdmin]

    def get(self, request):
        money = DecimalField(max_digits=18, decimal_places=2)
        locked = EscrowContract.objects.filter(stage__gte=EscrowContract.Stage.FUNDS_LOCKED, stage__lt=EscrowContract.Stage.RELEASED)
        released = EscrowContract.objects.filter(stage=EscrowContract.Stage.RELEASED)
        payments = Payment.objects.filter(status=Payment.Status.COMPLETED)

        def by_currency(qs, field='amount'):
            rows = qs.values('currency').annotate(total=Coalesce(Sum(field), Decimal('0'), output_field=money))
            return {row['currency']: row['total'] for row in rows}

        data = {
            'total_users': User.objects.count(),
            'total_farmers': User.objects.filter(role=User.Role.FARMER).count(),
            'total_buyers': User.objects.filter(role=User.Role.BUYER).count(),
            'bvn_verified_users': User.objects.filter(bvn_verified=True).count(),
            'total_escrows': EscrowContract.objects.count(),
            'escrow_locked_count': locked.count(),
            'escrow_locked_value': by_currency(locked),
            'escrow_released_value': by_currency(released),
            'total_payments': Payment.objects.count(),
            'payment_volume': by_currency(payments),
            'produce_listings': ProduceListing.objects.filter(is_active=True).count(),
            'active_pools': ImportPool.objects.filter(is_active=True).count(),
            'recent_users': [
                UserProfileMiniSerializer(u).data
                for u in User.objects.order_by('-date_joined')[:8]
            ],
            'recent_escrows': EscrowContractSerializer(
                EscrowContract.objects.order_by('-created_at')[:8], many=True,
            ).data,
        }
        return Response(AdminStatsSerializer(data).data)


class AdminUserListView(generics.ListAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all().order_by('-date_joined')
    search_fields = ['email', 'first_name', 'last_name', 'bvn']


class AdminEscrowListView(generics.ListAPIView):
    serializer_class = EscrowContractSerializer
    permission_classes = [IsAdmin]
    queryset = EscrowContract.objects.select_related('buyer', 'corporate_buyer')
