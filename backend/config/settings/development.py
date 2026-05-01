from .base import *

DEBUG = True

# Allow all hosts in development
ALLOWED_HOSTS = ['*']

# Show emails in console instead of sending
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Password reset token expiry (seconds) — 1 hour in dev
PASSWORD_RESET_TIMEOUT = 3600
