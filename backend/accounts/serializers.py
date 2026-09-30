"""Serializers for registration, login, profile and BVN KYC."""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = (
            'email', 'first_name', 'last_name', 'phone_number',
            'role', 'bvn', 'password', 'password2',
        )

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        role = attrs.get('role', User.Role.FARMER)
        if role == User.Role.ADMIN:
            # Admin accounts can only be created via Django admin / createsuperuser.
            raise serializers.ValidationError({'role': 'Admin accounts cannot self-register.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class AgroJetTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login serializer that adds role claims and profile data to the token."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserProfileSerializer(self.user).data
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone_number', 'role', 'bvn', 'bvn_verified', 'kyc_tier',
            'is_active', 'date_joined',
        )
        read_only_fields = ('id', 'email', 'bvn', 'bvn_verified', 'kyc_tier', 'is_active', 'date_joined')

    def get_full_name(self, obj):
        return obj.get_full_name()


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone_number')


class BvnVerifySerializer(serializers.Serializer):
    """BVN verification against the BMONI NIBSS sandbox registry."""

    BVN_REGISTRY = {
        '95888168924': {
            'firstName': 'Bunch', 'lastName': 'Dillon', 'dateOfBirth': '1990-01-15',
            'gender': 'male', 'nin': '63184876213', 'phone': '+2348030001122',
            'verificationStatus': 'VERIFIED_MATCH', 'confidenceScore': '99.8%',
        },
        '22222222222': {
            'firstName': 'Samson', 'lastName': 'Jabo', 'dateOfBirth': '1988-11-20',
            'gender': 'male', 'nin': '18482561982', 'phone': '+2348029993344',
            'verificationStatus': 'VERIFIED_MATCH', 'confidenceScore': '98.5%',
        },
        '33333333333': {
            'firstName': 'Amina', 'lastName': 'Abubakar', 'dateOfBirth': '1994-05-12',
            'gender': 'female', 'nin': '90218471625', 'phone': '+2348055551122',
            'verificationStatus': 'VERIFIED_MATCH', 'confidenceScore': '100.0%',
        },
    }

    bvn = serializers.RegexField(regex=r'^\d{11}$')

    def validate_bvn(self, value):
        if value not in self.BVN_REGISTRY:
            raise serializers.ValidationError('BVN record not found on NIBSS validation layer.')
        return value
