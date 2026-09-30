"""Serializers for marketplace catalog, escrow, payments and stats."""
from decimal import Decimal

from rest_framework import serializers

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

NGN_PER_USD = Decimal('1500')


class UserProfileMiniSerializer(serializers.Serializer):
    """Lightweight user row for dashboard tables."""

    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    role = serializers.CharField()
    kyc_tier = serializers.IntegerField()
    date_joined = serializers.DateTimeField()


class CorporateBuyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorporateBuyer
        fields = '__all__'


class ProduceListingSerializer(serializers.ModelSerializer):
    seller_name = serializers.CharField(source='seller.get_full_name', read_only=True)
    seller_email = serializers.CharField(source='seller.email', read_only=True)
    price_ngn = serializers.DecimalField(
        source='price_per_unit', max_digits=14, decimal_places=2, read_only=True,
    )

    class Meta:
        model = ProduceListing
        fields = (
            'id', 'seller', 'seller_name', 'seller_email', 'crop',
            'volume_available', 'unit', 'price_per_unit', 'price_ngn',
            'location', 'specs', 'rating', 'category', 'is_active', 'created_at',
        )
        read_only_fields = ('id', 'seller', 'rating', 'created_at')


class AgriInputSerializer(serializers.ModelSerializer):
    price_ngn = serializers.DecimalField(
        source='price', max_digits=14, decimal_places=2, read_only=True,
    )

    class Meta:
        model = AgriInput
        fields = (
            'id', 'name', 'category', 'merchant', 'price', 'price_ngn',
            'location', 'rating', 'stock', 'specs', 'is_active', 'created_at',
        )


class ImportPoolSerializer(serializers.ModelSerializer):
    price_ngn = serializers.SerializerMethodField()
    units_remaining = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = ImportPool
        fields = (
            'id', 'title', 'origin', 'category', 'price_usd', 'price_ngn',
            'retail_price_usd', 'target_units', 'reserved_units', 'units_remaining',
            'status', 'description', 'specs', 'group_savings', 'estimated_days',
            'is_active', 'created_at',
        )
        read_only_fields = ('reserved_units',)

    def get_price_ngn(self, obj):
        return int(obj.price_usd * NGN_PER_USD)


class EscrowContractSerializer(serializers.ModelSerializer):
    stage_label = serializers.CharField(source='get_stage_display', read_only=True)
    buyer_username = serializers.CharField(source='buyer.email', read_only=True)

    class Meta:
        model = EscrowContract
        fields = (
            'id', 'reference', 'kind', 'buyer', 'buyer_username', 'buyer_label',
            'seller_label', 'corporate_buyer', 'item', 'quantity', 'amount',
            'currency', 'stage', 'stage_label', 'status', 'quality_specs', 'created_at',
        )
        read_only_fields = fields


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            'id', 'reference', 'escrow', 'amount', 'currency', 'rail',
            'purpose', 'status', 'virtual_account', 'bank_name', 'created_at',
        )
        read_only_fields = fields


class PaymentInitSerializer(serializers.Serializer):
    """Initialize a BMONI sandbox checkout session (optionally binding an escrow)."""

    amount = serializers.DecimalField(max_digits=16, decimal_places=2, min_value=Decimal('0.01'))
    currency = serializers.ChoiceField(choices=[(c, c) for c in ('NGN', 'cNGN', 'USDB')])
    rail = serializers.ChoiceField(choices=Payment.Rail.choices, default=Payment.Rail.CNGN)
    purpose = serializers.CharField(max_length=250)
    kind = serializers.ChoiceField(
        choices=EscrowContract.Kind.choices, default=EscrowContract.Kind.HARVEST,
    )
    # Optional escrow binding payload
    seller_label = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    quantity = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')
    quality_specs = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    corporate_buyer = serializers.PrimaryKeyRelatedField(
        queryset=CorporateBuyer.objects.all(), required=False, allow_null=True,
    )
    produce = serializers.PrimaryKeyRelatedField(
        queryset=ProduceListing.objects.all(), required=False, allow_null=True,
    )
    pool = serializers.PrimaryKeyRelatedField(
        queryset=ImportPool.objects.all(), required=False, allow_null=True,
    )
    pool_units = serializers.IntegerField(min_value=1, required=False)


class PoolParticipationSerializer(serializers.ModelSerializer):
    pool_title = serializers.CharField(source='pool.title', read_only=True)

    class Meta:
        model = PoolParticipation
        fields = ('id', 'pool', 'pool_title', 'units', 'total_usd', 'escrow', 'created_at')
        read_only_fields = fields


class SupplyProposalSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='buyer.company_name', read_only=True)

    class Meta:
        model = SupplyProposal
        fields = (
            'id', 'buyer', 'company_name', 'tonnage', 'total_value',
            'escrow', 'status', 'created_at',
        )
        read_only_fields = ('user', 'escrow', 'status', 'total_value')


class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = ('ngn_balance', 'cngn_balance', 'usd_balance')


class AdminStatsSerializer(serializers.Serializer):
    """Platform KPIs for the custom admin dashboard."""

    total_users = serializers.IntegerField()
    total_farmers = serializers.IntegerField()
    total_buyers = serializers.IntegerField()
    bvn_verified_users = serializers.IntegerField()
    total_escrows = serializers.IntegerField()
    escrow_locked_count = serializers.IntegerField()
    escrow_locked_value = serializers.DictField(child=serializers.DecimalField(max_digits=18, decimal_places=2))
    escrow_released_value = serializers.DictField(child=serializers.DecimalField(max_digits=18, decimal_places=2))
    total_payments = serializers.IntegerField()
    payment_volume = serializers.DictField(child=serializers.DecimalField(max_digits=18, decimal_places=2))
    produce_listings = serializers.IntegerField()
    active_pools = serializers.IntegerField()
    recent_users = UserProfileMiniSerializer(many=True)
    recent_escrows = EscrowContractSerializer(many=True)
