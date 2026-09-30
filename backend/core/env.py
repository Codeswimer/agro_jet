"""Tiny typed wrapper around environment variables.

Exposes a single ``env`` object that is callable (``env('KEY', default)``) and
carries typed helpers (``env.bool``, ``env.int``, ``env.list``, ``env.timedelta``)
so every knob is discoverable in one place and documented in ``.env.example``.
"""
import os
from datetime import timedelta

_TRUTHY = ('1', 'true', 'yes', 'on')


class Env:
    """Environment-variable reader with typed accessors."""

    def __call__(self, key, default=None):
        value = os.environ.get(key)
        if value is None or value == '':
            return default
        return value

    def bool(self, key, default=False):
        raw = self(key)
        if raw is None:
            return default
        return raw.strip().lower() in _TRUTHY

    def int(self, key, default=0):
        raw = self(key)
        if raw is None:
            return default
        try:
            return int(raw)
        except ValueError:
            return default

    def list(self, key, default=None):
        raw = self(key)
        if raw is None:
            return default if default is not None else []
        return [item.strip() for item in raw.split(',') if item.strip()]

    def timedelta(self, key, default_minutes=0):
        return timedelta(minutes=self.int(key, default=default_minutes))

    def timedelta_days(self, key, default_days=0):
        return timedelta(days=self.int(key, default=default_days))


env = Env()
