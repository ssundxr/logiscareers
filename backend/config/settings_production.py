"""
Production settings for GCP deployment.
"""

from .settings import *
import os

# Security
DEBUG = False
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-production-secret-key-change-this')

# Hosts
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Database - Cloud SQL
if os.getenv('GAE_APPLICATION', None):
    # Running on production App Engine
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': f'/cloudsql/{os.environ.get("CLOUD_SQL_CONNECTION_NAME")}',
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'NAME': os.environ.get('DB_NAME', 'logis_ml_db'),
        }
    }
else:
    # Local development or using external Cloud SQL
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD'),
            'NAME': os.environ.get('DB_NAME', 'logis_ml_db'),
        }
    }

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# GCS Storage (optional - for production media files)
if os.environ.get('USE_GCS_STORAGE', 'False') == 'True':
    DEFAULT_FILE_STORAGE = 'storages.backends.gcloud.GoogleCloudStorage'
    GS_BUCKET_NAME = os.environ.get('GS_BUCKET_NAME')
    GS_PROJECT_ID = os.environ.get('GS_PROJECT_ID')
    MEDIA_URL = f'https://storage.googleapis.com/{GS_BUCKET_NAME}/'

# CORS
CORS_ALLOWED_ORIGINS = [
    os.environ.get('FRONTEND_URL', 'https://your-frontend-url.web.app'),
]

# CSRF
CSRF_TRUSTED_ORIGINS = [
    os.environ.get('FRONTEND_URL', 'https://your-frontend-url.web.app'),
]

# Security Settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
