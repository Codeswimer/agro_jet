"""Business logic for BMONI sandbox payments and escrow lifecycle."""
from decimal import Decimal

from django.db import transaction

from .models import (
    EscrowContract,
    Payment,
    PoolParticipation,
    ProduceListing,
    SupplyProposal,
    Wallet,
)


class PaymentError(Exception):
    """Raised when a payment or escrow transition is invalid."""


def get_wallet(user):
    wallet, _created = Wallet.objects.get_or_create(user=user)
    return wallet


class PaymentService:
    """Orchestrates the sandbox checkout cycle: initialize → confirm → release."""

    SANDBOX_FAUCET_MULTIPLIER = Decimal('2')

    @staticmethod
    @transaction.atomic
    def initialize(user, data):
        """Create a PENDING payment and (optionally) bind a DRAFTED escrow."""
        escrow = None
        if data.get('seller_label') or data.get('corporate_buyer'):
            escrow = EscrowContract.objects.create(
                kind=data['kind'],
                buyer=user,
                buyer_label=user.get_full_name() or user.email,
                seller_label=data.get('seller_label') or 'AGRO JET Supplier',
                corporate_buyer=data.get('corporate_buyer'),
                item=data['purpose'],
                quantity=data.get('quantity') or '1',
                amount=data['amount'],
                currency=data['currency'],
                quality_specs=data.get('quality_specs', ''),
                stage=EscrowContract.Stage.DRAFTED,
            )

        payment = Payment.objects.create(
            user=user,
            escrow=escrow,
            pool=data.get('pool'),
            pool_units=data.get('pool_units'),
            quantity=data.get('quantity') or '',
            amount=data['amount'],
            currency=data['currency'],
            rail=data['rail'],
            purpose=data['purpose'],
        )
        return payment

    @staticmethod
    @transaction.atomic
    def confirm(user, payment):
        """Mark a payment complete: debit the wallet and lock escrow funds."""
        if payment.status == Payment.Status.COMPLETED:
            return payment
        if payment.user_id != user.id and not user.is_admin_role:
            raise PaymentError('You cannot confirm a payment you do not own.')

        wallet = get_wallet(user)
        if getattr(wallet, Wallet._field_for(payment.currency)) < payment.amount:
            # Sandbox faucet: auto-fund the wallet so demos never dead-end.
            wallet.credit(payment.currency, payment.amount * PaymentService.SANDBOX_FAUCET_MULTIPLIER)
        wallet.debit(payment.currency, payment.amount)

        payment.status = Payment.Status.COMPLETED
        payment.save(update_fields=['status', 'updated_at'])

        escrow = payment.escrow
        if escrow:
            escrow.stage = EscrowContract.Stage.FUNDS_LOCKED
            escrow.save(update_fields=['stage', 'updated_at'])
            PaymentService._bind_side_effects(user, payment, escrow)
        return payment

    @staticmethod
    def _bind_side_effects(user, payment, escrow):
        """Update dependent records once funds are locked."""
        if escrow.kind == EscrowContract.Kind.POOL:
            pool = payment.pool
            units = payment.pool_units or 1
            if pool is None:
                raise PaymentError('Pool payments must reference an import pool.')
            units = min(units, pool.units_remaining)
            if units <= 0:
                raise PaymentError('This import pool is already fully reserved.')
            pool.reserved_units += units
            pool.save(update_fields=['reserved_units', 'updated_at'])
            PoolParticipation.objects.create(
                pool=pool, user=user, units=units,
                total_usd=pool.price_usd * units, escrow=escrow,
            )
        if escrow.kind == EscrowContract.Kind.OFFTAKE and escrow.corporate_buyer_id:
            try:
                tonnage = Decimal(str(payment.quantity or '0'))
            except ArithmeticError:
                tonnage = Decimal('0')
            SupplyProposal.objects.create(
                buyer=escrow.corporate_buyer, user=user,
                tonnage=tonnage,
                total_value=payment.amount, escrow=escrow,
                status=SupplyProposal.ProposalStatus.IN_ESCROW,
            )

    @staticmethod
    @transaction.atomic
    def release(escrow, actor):
        """Verify quality and release funds to the seller (buyer or admin only)."""
        if escrow.stage >= EscrowContract.Stage.RELEASED:
            raise PaymentError('Escrow funds were already released.')
        is_party = escrow.buyer_id == actor.id
        if not (is_party or actor.is_admin_role):
            raise PermissionError('Only the contract buyer or an admin can release escrow funds.')
        escrow.stage = EscrowContract.Stage.RELEASED
        escrow.save(update_fields=['stage', 'updated_at'])
        return escrow
