"""
WSGI config for AGRO JET backend.

Expose the WSGI callable as a module-level variable named ``application``.

For Vercel's Python runtime, ``app`` is also exposed because the platform
looks for that variable by default.
"""
import os
import sys

# Ensure the backend package root is importable in serverless environments.
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.append(BACKEND_ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'entrypoints.settings.production')

from django.core.wsgi import get_wsgi_application  # noqa: E402

application = get_wsgi_application()
app = application  # Vercel serverless handler entrypoint
