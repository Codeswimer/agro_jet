"""Django admin registrations for marketplace models."""
from django.contrib import admin

from .models import (
    AgriInput,
    CorporateBuyer,
    EscrowContract,
    ImportPool,
    Payment,
    PoolParticipation,
    ProduceListing,
    SupplyProposal,
    Wallet,
)


@admin.register(CorporateBuyer)
class CorporateBuyerAdmin(admin.ModelAdmin):
    list_display = ('company_name', 'category', 'monthly_volume_req', 'verified_buyer', 'is_active')
    list_filter = ('category', 'verified_buyer', 'is_active')
    search_fields = ('company_name', 'raw_material_needed', 'location')


@admin.register(ProduceListing)
class ProduceListingAdmin(admin.ModelAdmin):
    list_display = ('crop', 'seller', 'volume_available', 'unit', 'price_per_unit', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('crop', 'seller__email', 'location')


@admin.register(AgriInput)
class AgriInputAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'merchant', 'price', 'stock', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'merchant')


@admin.register(ImportPool)
class ImportPoolAdmin(admin.ModelAdmin):
    list_display = ('title', 'origin', 'price_usd', 'reserved_units', 'target_units', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('title', 'origin')


@admin.register(EscrowContract)
class EscrowContractAdmin(admin.ModelAdmin):
    list_display = ('reference', 'kind', 'buyer', 'seller_label', 'amount', 'currency', 'stage', 'created_at')
    list_filter = ('kind', 'stage', 'currency')
    search_fields = ('reference', 'seller_label', 'buyer__email', 'item')
    readonly_fields = ('reference',)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('reference', 'user', 'amount', 'currency', 'rail', 'status', 'created_at')
    list_filter = ('status', 'rail', 'currency')
    search_fields = ('reference', 'user__email', 'purpose')
    readonly_fields = ('reference', 'virtual_account')


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'ngn_balance', 'cngn_balance', 'usd_balance')


@admin.register(PoolParticipation)
class PoolParticipationAdmin(admin.ModelAdmin):
    list_display = ('pool', 'user', 'units', 'total_usd', 'created_at')


@admin.register(SupplyProposal)
class SupplyProposalAdmin(admin.ModelAdmin):
    list_display = ('buyer', 'user', 'tonnage', 'total_value', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('buyer__company_name', 'user__email')
