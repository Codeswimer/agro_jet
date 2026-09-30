"""Domain models: offtake buyers, produce, inputs, pools, escrow and payments."""
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


def generate_reference(prefix):
    """Short human-friendly reference, e.g. ``esc_7f3a9b2c``."""
    return f'{prefix}_{uuid.uuid4().hex[:9]}'


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ---------------------------------------------------------------------------
# Catalog models
# ---------------------------------------------------------------------------
class CorporateBuyer(TimeStampedModel):
    """Corporate offtaker looking for raw materials from farmers."""

    class Category(models.TextChoices):
        MAIZE = 'Maize', 'Maize'
        CASSAVA = 'Cassava', 'Cassava'
        SOYBEANS = 'Soybeans', 'Soybeans'
        SESAME = 'Sesame', 'Sesame'
        OTHER = 'Other', 'Other'

    company_name = models.CharField(max_length=200, unique=True)
    industry = models.CharField(max_length=120)
    raw_material_needed = models.CharField(max_length=200)
    monthly_volume_req = models.CharField(max_length=60)
    offer_price = models.CharField(max_length=60)  # display string, e.g. "₦490,000 / MT"
    unit_price_numeric = models.DecimalField(max_digits=14, decimal_places=2)
    location = models.CharField(max_length=200)
    quality_specs = models.JSONField(default=list)  # ["Moisture < 12%", ...]
    escrow_deposit_locked = models.CharField(max_length=120)
    contact_person = models.CharField(max_length=120)
    category = models.CharField(max_length=16, choices=Category.choices, db_index=True)
    verified_buyer = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['company_name']

    def __str__(self):
        return self.company_name


class ProduceListing(TimeStampedModel):
    """Harvest produce offered by cooperatives / farmers."""

    class ProduceCategory(models.TextChoices):
        GRAIN = 'Grain', 'Grain'
        TUBER = 'Tuber', 'Tuber'
        OILSEED = 'Oilseed', 'Oilseed'
        LEGUME = 'Legume', 'Legume'
        OTHER = 'Other', 'Other'

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='produce_listings',
    )
    crop = models.CharField(max_length=200)
    volume_available = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=8, default='MT')
    price_per_unit = models.DecimalField(max_digits=14, decimal_places=2)  # NGN per unit
    location = models.CharField(max_length=200)
    specs = models.JSONField(default=list)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=Decimal('4.8'))
    category = models.CharField(max_length=16, choices=ProduceCategory.choices, default=ProduceCategory.OTHER)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.crop} — {self.seller}'


class AgriInput(TimeStampedModel):
    """Merchant-listed farm input (seeds, fertilizer, machinery)."""

    class InputCategory(models.TextChoices):
        SEEDS = 'Seeds', 'Seeds'
        FERTILIZERS = 'Fertilizers', 'Fertilizers'
        TOOLS = 'Tools & Machinery', 'Tools & Machinery'
        OTHER = 'Other', 'Other'

    name = models.CharField(max_length=200)
    category = models.CharField(max_length=24, choices=InputCategory.choices, db_index=True)
    merchant = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=14, decimal_places=2)  # NGN
    location = models.CharField(max_length=200)
    rating = models.DecimalField(max_digits=2, decimal_places=1, default=Decimal('4.7'))
    stock = models.CharField(max_length=60)
    specs = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ImportPool(TimeStampedModel):
    """Group-buy co-import pool for machinery / green tech."""

    title = models.CharField(max_length=250)
    origin = models.CharField(max_length=120)
    category = models.CharField(max_length=120)
    price_usd = models.DecimalField(max_digits=12, decimal_places=2)
    retail_price_usd = models.DecimalField(max_digits=12, decimal_places=2)
    target_units = models.PositiveSmallIntegerField()
    reserved_units = models.PositiveSmallIntegerField(default=0)
    description = models.TextField()
    specs = models.JSONField(default=list)
    group_savings = models.CharField(max_length=200)
    estimated_days = models.PositiveSmallIntegerField(default=21)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def units_remaining(self):
        return max(0, self.target_units - self.reserved_units)

    @property
    def status(self):
        if self.reserved_units >= self.target_units:
            return 'Pool Reached! Order Placed'
        if self.reserved_units > 0:
            pct = round(self.reserved_units / self.target_units * 100)
            return f'Pooling Active ({pct}% Locked)'
        return 'Pooling Active'


# ---------------------------------------------------------------------------
# Wallet
# ---------------------------------------------------------------------------
class Wallet(TimeStampedModel):
    """Multi-currency sandbox wallet: NGN fiat, cNGN and USDB stables."""

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wallet')
    ngn_balance = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0'))
    cngn_balance = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0'))
    usd_balance = models.DecimalField(max_digits=16, decimal_places=2, default=Decimal('0'))

    def __str__(self):
        return f'Wallet<{self.user.email}>'

    def debit(self, currency, amount):
        """Debit a rail. Raises ValueError when funds are insufficient."""
        field = self._field_for(currency)
        balance = getattr(self, field)
        if balance < amount:
            raise ValueError(f'Insufficient {currency} balance ({balance} < {amount}).')
        setattr(self, field, balance - amount)
        self.save(update_fields=[field, 'updated_at'])

    def credit(self, currency, amount):
        field = self._field_for(currency)
        setattr(self, field, getattr(self, field) + amount)
        self.save(update_fields=[field, 'updated_at'])

    @staticmethod
    def _field_for(currency):
        return {
            'NGN': 'ngn_balance',
            'cNGN': 'cngn_balance',
            'USDB': 'usd_balance',
        }[currency]


# ---------------------------------------------------------------------------
# Escrow + payments
# ---------------------------------------------------------------------------
class EscrowContract(TimeStampedModel):
    """Multi-currency smart escrow contract with a 4-stage milestone ledger."""

    class Stage(models.IntegerChoices):
        DRAFTED = 1, 'Contract Drafted'
        FUNDS_LOCKED = 2, 'Funds Locked'
        INSPECTION = 3, 'Quality Inspection'
        RELEASED = 4, 'Settlement Released'

    class Kind(models.TextChoices):
        HARVEST = 'HARVEST', 'Harvest produce purchase'
        OFFTAKE = 'OFFTAKE', 'Corporate offtake supply'
        POOL = 'POOL', 'Group import pool'
        INPUT = 'INPUT', 'Agri-input purchase'

    reference = models.CharField(max_length=20, unique=True, editable=False)
    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.HARVEST)
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='escrows_as_buyer',
    )
    buyer_label = models.CharField(max_length=200, blank=True)
    seller_label = models.CharField(max_length=200)
    corporate_buyer = models.ForeignKey(
        CorporateBuyer, null=True, blank=True, on_delete=models.SET_NULL, related_name='escrows',
    )
    item = models.CharField(max_length=250)
    quantity = models.CharField(max_length=60)
    amount = models.DecimalField(max_digits=16, decimal_places=2)
    currency = models.CharField(max_length=8, choices=[(c, c) for c in settings.SUPPORTED_CURRENCIES])
    stage = models.PositiveSmallIntegerField(choices=Stage.choices, default=Stage.DRAFTED)
    quality_specs = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference('esc')
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.reference} ({self.get_stage_display()})'

    @property
    def status(self):
        return self.get_stage_display().upper().replace(' ', '_')


class Payment(TimeStampedModel):
    """A BMONI sandbox payment initialization → confirmation cycle."""

    class Rail(models.TextChoices):
        CNGN = 'cngn', 'cNGN Stablecoin'
        USDB = 'usdb', 'USDB (USD Stable)'
        BANK = 'bank', 'NGN Fiat Bank Transfer'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    reference = models.CharField(max_length=30, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments')
    escrow = models.ForeignKey(EscrowContract, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments')
    pool = models.ForeignKey(ImportPool, null=True, blank=True, on_delete=models.SET_NULL, related_name='payments')
    pool_units = models.PositiveSmallIntegerField(null=True, blank=True)
    quantity = models.CharField(max_length=60, blank=True)
    amount = models.DecimalField(max_digits=16, decimal_places=2)
    currency = models.CharField(max_length=8, choices=[(c, c) for c in settings.SUPPORTED_CURRENCIES])
    rail = models.CharField(max_length=8, choices=Rail.choices, default=Rail.CNGN)
    purpose = models.CharField(max_length=250)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    virtual_account = models.CharField(max_length=20, blank=True)
    bank_name = models.CharField(max_length=120, default='BMONI Settlement Bank (NIBSS)')

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f'tx_agrojet_{uuid.uuid4().hex[:9]}'
        if not self.virtual_account:
            self.virtual_account = f'99{uuid.uuid4().int % 10**8:08d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.reference} ({self.status})'


class PoolParticipation(TimeStampedModel):
    """A user's reserved units inside an import pool."""

    pool = models.ForeignKey(ImportPool, on_delete=models.CASCADE, related_name='participations')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='pool_participations')
    units = models.PositiveSmallIntegerField()
    total_usd = models.DecimalField(max_digits=14, decimal_places=2)
    escrow = models.ForeignKey(EscrowContract, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} × {self.units} @ {self.pool.title[:40]}'


class SupplyProposal(TimeStampedModel):
    """Farmer's tonnage offer bound to a corporate offtake listing."""

    class ProposalStatus(models.TextChoices):
        SUBMITTED = 'SUBMITTED', 'Submitted'
        IN_ESCROW = 'IN_ESCROW', 'Escrow Locked'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REJECTED = 'REJECTED', 'Rejected'

    buyer = models.ForeignKey(CorporateBuyer, on_delete=models.CASCADE, related_name='proposals')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='supply_proposals')
    tonnage = models.DecimalField(max_digits=12, decimal_places=2)
    total_value = models.DecimalField(max_digits=16, decimal_places=2)
    escrow = models.ForeignKey(EscrowContract, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=12, choices=ProposalStatus.choices, default=ProposalStatus.SUBMITTED)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.tonnage} MT → {self.buyer.company_name}'
