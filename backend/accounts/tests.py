"""Tests for authentication, profile and BVN KYC endpoints."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

REGISTER_PAYLOAD = {
    'email': 'newfarmer@example.com',
    'first_name': 'Ada',
    'last_name': 'Obi',
    'phone_number': '+2348012345678',
    'role': 'FARMER',
    'password': 'StrongPass!2026',
    'password2': 'StrongPass!2026',
}


class RegistrationTests(APITestCase):
    def test_register_farmer_success(self):
        response = self.client.post('/api/auth/register/', REGISTER_PAYLOAD)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'newfarmer@example.com')
        self.assertEqual(response.data['role'], 'FARMER')

    def test_register_admin_forbidden(self):
        payload = {**REGISTER_PAYLOAD, 'role': 'ADMIN'}
        response = self.client.post('/api/auth/register/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_password_mismatch(self):
        payload = {**REGISTER_PAYLOAD, 'password2': 'different'}
        response = self.client.post('/api/auth/register/', payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AuthFlowTests(APITestCase):
    def setUp(self):
        self.client.post('/api/auth/register/', REGISTER_PAYLOAD)

    def _login(self, email='newfarmer@example.com', password='StrongPass!2026'):
        return self.client.post('/api/auth/login/', {'email': email, 'password': password})

    def test_login_returns_jwt_and_profile(self):
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['email'], 'newfarmer@example.com')

    def test_me_requires_auth(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_profile_with_token(self):
        token = self._login().data['access']
        response = self.client.get(
            '/api/auth/me/', HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Ada Obi')

    def test_refresh_token_flow(self):
        refresh = self._login().data['refresh']
        response = self.client.post('/api/auth/refresh/', {'refresh': refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)


class BvnKycTests(APITestCase):
    def setUp(self):
        self.client.post('/api/auth/register/', REGISTER_PAYLOAD)
        self.token = self.client.post(
            '/api/auth/login/', {'email': 'newfarmer@example.com', 'password': 'StrongPass!2026'},
        ).data['access']
        self.auth = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}

    def test_bvn_verify_success(self):
        response = self.client.post(
            '/api/kyc/bvn-verify/', {'bvn': '95888168924'}, **self.auth,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'VERIFIED')
        self.assertEqual(response.data['bvn_record']['firstName'], 'Bunch')

    def test_bvn_verify_unknown_bvn(self):
        response = self.client.post(
            '/api/kyc/bvn-verify/', {'bvn': '00000000000'}, **self.auth,
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bvn_verify_requires_11_digits(self):
        response = self.client.post('/api/kyc/bvn-verify/', {'bvn': '12345'}, **self.auth)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
