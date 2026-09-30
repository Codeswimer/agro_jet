from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ('email',)
    list_display = ('email', 'first_name', 'last_name', 'role', 'kyc_tier', 'bvn_verified', 'is_active')
    list_filter = ('role', 'kyc_tier', 'bvn_verified', 'is_active', 'is_staff')
    search_fields = ('email', 'first_name', 'last_name', 'phone_number', 'bvn')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Profile', {'fields': ('first_name', 'last_name', 'phone_number')}),
        ('KYC / BMONI', {'fields': ('bvn', 'bvn_verified', 'kyc_tier')}),
        ('Role & permissions', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role', 'is_staff', 'is_superuser'),
        }),
    )
