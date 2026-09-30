"""Custom user model with role-based access (farmer/buyer/admin)."""
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Manager where email is the unique identifier for authentication."""

    use_in_migrations = True

    def _create(self, email, password, **extra_fields):
        if not email:
            raise ValueError('A valid email address is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)
        extra_fields.setdefault('first_name', extra_fields.get('first_name', 'Admin'))
        if extra_fields['is_staff'] is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields['is_superuser'] is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self._create(email, password, **extra_fields)


class User(AbstractUser):
    """Platform user. Email is the login identifier; username is dropped."""

    class Role(models.TextChoices):
        FARMER = 'FARMER', 'Farmer / Supplier'
        BUYER = 'BUYER', 'Buyer / Offtaker'
        ADMIN = 'ADMIN', 'Administrator'

    username = None  # remove the username field entirely
    email = models.EmailField('email address', unique=True)
    role = models.CharField(
        max_length=16,
        choices=Role.choices,
        default=Role.FARMER,
        db_index=True,
    )
    phone_number = models.CharField(max_length=20, blank=True)
    # KYC / BMONI sandbox fields
    bvn = models.CharField(max_length=11, blank=True, db_index=True)
    bvn_verified = models.BooleanField(default=False)
    kyc_tier = models.PositiveSmallIntegerField(default=0)  # 0 unverified, 1 basic, 2 verified

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        ordering = ['date_joined']
        indexes = [
            models.Index(fields=['role', 'bvn_verified']),
        ]

    def __str__(self):
        return f'{self.get_full_name() or self.email} ({self.role})'

    @property
    def full_name(self):
        return self.get_full_name()

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN or self.is_superuser
