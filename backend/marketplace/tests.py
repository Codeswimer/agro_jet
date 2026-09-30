"""Tests for catalog, wallet, escrow lifecycle, payments and admin stats."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CorporateBuyer, EscrowContract, ImportPool, ProduceListing

User = get_user_model()

PASSWORD = 'StrongPass!2026'


def make_user(email, role=User.Role.FARMER, **kwargs):
    return User.objects.create_user(email=email, password=PASSWORD, role=role, **kwargs)


class AuthMixin:
    def authenticate(self, user):
        token = self.client.post(
            '/api/auth/login/', {'email': user.email, 'password': PASSWORD},
        ).data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class CatalogTests(AuthMixin, APITestCase):
    def test_buyers_public(self):
        CorporateBuyer.objects.create(
            company_name='Test Agro Ltd', industry='FMCG',
            raw_material_needed='Maize', monthly_volume_req='100 MT',
            offer_price='₦100,000 / MT', unit_price_numeric=Decimal('100000'),
            location='Lagos', contact_person='Buyer Desk', category='Maize',
        )
        response = self.client.get('/api/marketplace/buyers/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['company_name'], 'Test Agro Ltd')

    def test_buyer_search_filter(self):
        CorporateBuyer.objects.create(
            company_name='Kaduna Mills', industry='Feed',
            raw_material_needed='Sorghum', monthly_volume_req='50 MT',
            offer_price='₦90,000 / MT', unit_price_numeric=Decimal('90000'),
            location='Kaduna', contact_person='X', category='Maize',
        )
        response = self.client.get('/api/marketplace/buyers/?search=kaduna')
        self.assertEqual(response.data['count'], 1)

    def test_produce_create_requires_auth(self):
        response = self.client.post('/api/marketplace/produce/new/', {'crop': 'Maize'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_produce_create(self):
        user = make_user('seller@example.com')
        self.authenticate(user)
        response = self.client.post('/api/marketplace/produce/new/', {
            'crop': 'Yellow Maize', 'volume_available': '50.00',
            'unit': 'MT', 'price_per_unit': '450000.00',
            'location': 'Ogun', 'specs': ['Dry'], 'category': 'Grain',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ProduceListing.objects.filter(seller=user).count(), 1)


class EscrowPaymentTests(AuthMixin, APITestCase):
    def setUp(self):
        self.user = make_user('buyer@example.com', role=User.Role.BUYER)
        self.authenticate(self.user)

    def test_wallet_defaults_created(self):
        response = self.client.get('/api/wallet/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(response.data['ngn_balance']), Decimal('0'))

    def test_full_harvest_escrow_cycle(self):
        init = self.client.post('/api/payments/initialize/', {
            'amount': '900000.00', 'currency': 'cNGN', 'rail': 'cngn',
            'purpose': '20 MT Cleaned Yellow Maize',
            'kind': 'HARVEST',
            'seller_label': 'Ogun Farmers Cooperative Union',
            'quantity': '20 MT', 'quality_specs': 'Moisture < 12%',
        })
        self.assertEqual(init.status_code, status.HTTP_201_CREATED)
        reference = init.data['payment']['reference']
        escrow_id = init.data['escrow']['id']
        self.assertEqual(init.data['escrow']['stage'], 1)

        confirm = self.client.post('/api/payments/confirm/', {'reference': reference})
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)
        self.assertEqual(confirm.data['payment']['status'], 'COMPLETED')
        self.assertEqual(confirm.data['escrow']['stage'], 2)
        # Sandbox faucet funded 2x then debited once → one amount remains.
        self.assertEqual(Decimal(confirm.data['wallet']['cngn_balance']), Decimal('900000.00'))

        release = self.client.post(f'/api/escrows/{escrow_id}/release/')
        self.assertEqual(release.status_code, status.HTTP_200_OK)
        self.assertEqual(release.data['stage'], 4)

    def test_release_requires_ownership(self):
        init = self.client.post('/api/payments/initialize/', {
            'amount': '500.00', 'currency': 'cNGN', 'purpose': 'test',
            'seller_label': 'Seller X', 'quantity': '1',
        })
        escrow_id = init.data['escrow']['id']
        other = make_user('outsider@example.com')
        self.authenticate(other)
        response = self.client.post(f'/api/escrows/{escrow_id}/release/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_release_any_escrow(self):
        init = self.client.post('/api/payments/initialize/', {
            'amount': '500.00', 'currency': 'cNGN', 'purpose': 'test',
            'seller_label': 'Seller X', 'quantity': '1',
        })
        escrow_id = init.data['escrow']['id']
        admin = make_user('root@example.com', role=User.Role.ADMIN,
                          is_staff=True, is_superuser=True)
        self.authenticate(admin)
        response = self.client.post(f'/api/escrows/{escrow_id}/release/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_double_release_rejected(self):
        init = self.client.post('/api/payments/initialize/', {
            'amount': '500.00', 'currency': 'cNGN', 'purpose': 'test',
            'seller_label': 'Seller X', 'quantity': '1',
        })
        escrow_id = init.data['escrow']['id']
        self.client.post(f'/api/escrows/{escrow_id}/release/')
        response = self.client.post(f'/api/escrows/{escrow_id}/release/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pool_join_increments_reserved_units(self):
        pool = ImportPool.objects.create(
            title='Test Pool', origin='Germany', category='Drying',
            price_usd=Decimal('1000'), retail_price_usd=Decimal('1500'),
            target_units=10, reserved_units=5, description='d',
            specs=[], group_savings='save',
        )
        init = self.client.post('/api/payments/initialize/', {
            'amount': '2000.00', 'currency': 'USDB', 'rail': 'usdb',
            'purpose': 'Test Pool x2', 'kind': 'POOL',
            'seller_label': 'AGRO JET Group Import', 'quantity': '2 units',
            'pool': pool.id, 'pool_units': 2,
        })
        reference = init.data['payment']['reference']
        confirm = self.client.post('/api/payments/confirm/', {'reference': reference})
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)
        pool.refresh_from_db()
        self.assertEqual(pool.reserved_units, 7)


class AdminDashboardTests(AuthMixin, APITestCase):
    def test_stats_require_staff(self):
        user = make_user('plain@example.com')
        self.authenticate(user)
        response = self.client.get('/api/admin-panel/stats/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stats_for_admin(self):
        admin = make_user('boss@example.com', role=User.Role.ADMIN,
                          is_staff=True, is_superuser=True)
        self.authenticate(admin)
        response = self.client.get('/api/admin-panel/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('escrow_locked_value', response.data)
        self.assertIn('recent_escrows', response.data)
