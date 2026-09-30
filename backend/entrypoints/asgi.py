"""
ASGI config for AGRO JET backend.

Exposes the ASGI callable as a module-level variable named ``application``.
"""
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'entrypoints.settings.local')

from django.core.asgi import get_asgi_application  # noqa: E402

application = get_asgi_application()
