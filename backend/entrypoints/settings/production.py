"""Production settings — Neon Postgres, hardened security headers, Vercel-ready."""
import dj_database_url

from .base import *  # noqa: F401,F403
from .base import CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS, DATABASES, INSTALLED_APPS
from core.env import env

DEBUG = False
SECRET_KEY = env('DJANGO_SECRET_KEY')  # required in production — fail fast if missing

ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS', default=['.vercel.app'])

# ---------------------------------------------------------------------------
# Database: DATABASE_URL (Neon Postgres) with sane connection pooling for
# serverless environments.
# ---------------------------------------------------------------------------
_db_url = env('DATABASE_URL', default='')
if _db_url:
    DATABASES['default'] = dj_database_url.parse(
        _db_url,
        conn_max_age=600,
        ssl_require=True,
    )
    DATABASES['default']['OPTIONS'] = {
        # Neon pools over pgbouncer on port 6543; keep statement timeouts sane.
        'connect_timeout': 10,
    }

# ---------------------------------------------------------------------------
# CORS / CSRF: frontend origins must be whitelisted via env in production.
# ---------------------------------------------------------------------------
_extra_cors = env.list('CORS_ALLOWED_ORIGINS', default=[])
if _extra_cors:
    CORS_ALLOWED_ORIGINS = list(set(CORS_ALLOWED_ORIGINS + _extra_cors))
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Static files: serve admin/DRF assets straight from app finders so no
# collectstatic step is needed on the read-only serverless filesystem.
# ---------------------------------------------------------------------------
STORAGES['staticfiles'] = {'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage'}
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = False

# ---------------------------------------------------------------------------
# Security hardening behind Vercel's proxy
# ---------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = env.bool('DJANGO_SECURE_SSL_REDIRECT', default=True)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
