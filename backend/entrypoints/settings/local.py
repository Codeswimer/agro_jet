"""Local development settings — SQLite, permissive CORS, verbose errors."""
from .base import *  # noqa: F401,F403
from .base import DATABASES, INSTALLED_APPS, MIDDLEWARE

DEBUG = True

DATABASES['default'] = {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': BASE_DIR / 'db.sqlite3',
}

# Relax static files hashing locally so missing collectstatic never breaks dev.
STORAGES['staticfiles'] = {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}

# Allow any localhost origin during development.
CORS_ALLOWED_ORIGINS = list(set(CORS_ALLOWED_ORIGINS + [
    'http://localhost:4173', 'http://127.0.0.1:5173',
]))
