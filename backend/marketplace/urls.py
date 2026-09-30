from django.urls import path

from .views import (
    AdminEscrowListView,
    AdminStatsView,
    AdminUserListView,
    AgriInputListView,
    CorporateBuyerListView,
    EscrowListView,
    EscrowReleaseView,
    ImportPoolListView,
    PaymentConfirmView,
    PaymentInitializeView,
    PaymentListView,
    ProduceListingCreateView,
    ProduceListingListView,
    WalletView,
)

app_name = 'marketplace'

urlpatterns = [
    # Catalog
    path('marketplace/buyers/', CorporateBuyerListView.as_view(), name='buyers'),
    path('marketplace/produce/', ProduceListingListView.as_view(), name='produce'),
    path('marketplace/produce/new/', ProduceListingCreateView.as_view(), name='produce-create'),
    path('marketplace/inputs/', AgriInputListView.as_view(), name='inputs'),
    path('marketplace/pools/', ImportPoolListView.as_view(), name='pools'),
    # Wallet & payments
    path('wallet/', WalletView.as_view(), name='wallet'),
    path('payments/initialize/', PaymentInitializeView.as_view(), name='payment-init'),
    path('payments/confirm/', PaymentConfirmView.as_view(), name='payment-confirm'),
    path('payments/', PaymentListView.as_view(), name='payments'),
    # Escrow
    path('escrows/', EscrowListView.as_view(), name='escrows'),
    path('escrows/<int:pk>/release/', EscrowReleaseView.as_view(), name='escrow-release'),
    # Admin dashboard
    path('admin-panel/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin-panel/escrows/', AdminEscrowListView.as_view(), name='admin-escrows'),
    path('admin-panel/users/', AdminUserListView.as_view(), name='admin-users'),
]
