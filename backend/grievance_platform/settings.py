from pathlib import Path
from decouple import config
from datetime import timedelta
from mongoengine import connect

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='dev-secret-key-change-in-production')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,::1,backend').split(',')

# ─── Apps ──────────────────────────────────────────────────────────────────────
# Removed: django.contrib.admin, django.contrib.auth, django.contrib.sessions
# — these require SQL tables that don't exist (MongoDB-only project)
DJANGO_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'django.contrib.auth',      # required by simplejwt at import time
    'django.contrib.sessions',  # required by session middleware
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'django_filters',
    'drf_yasg',
]

LOCAL_APPS = [
    'apps.accounts',
    'apps.departments',
    'apps.complaints',
    'apps.notifications',
    'apps.chat',
    'apps.reports',
    'apps.services',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ─── Middleware ─────────────────────────────────────────────────────────────────
# Removed: SessionMiddleware, AuthenticationMiddleware — both require SQL tables
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'grievance_platform.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'grievance_platform.wsgi.application'
ASGI_APPLICATION = 'grievance_platform.asgi.application'

# ─── MongoDB ────────────────────────────────────────────────────────────────────
MONGO_DB = config('DB_NAME', default='grievance_platform')
MONGO_HOST = config('DB_HOST', default='mongo')
MONGO_PORT = int(config('DB_PORT', default='27017'))
MONGO_USER = config('DB_USER', default='')
MONGO_PASSWORD = config('DB_PASSWORD', default='')
MONGO_URI = config('DB_URL', default='')

if MONGO_URI:
    mongo_connection_uri = MONGO_URI
elif MONGO_USER and MONGO_PASSWORD:
    mongo_connection_uri = f'mongodb://{MONGO_USER}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/{MONGO_DB}?authSource=admin'
else:
    mongo_connection_uri = f'mongodb://{MONGO_HOST}:{MONGO_PORT}/{MONGO_DB}'

# Dummy SQL database — SQLite file so migrations survive restarts
# Django's internal tables (auth, contenttypes, sessions) are stored here
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'django_internal.sqlite3',
    }
}

# MongoEngine connection (the real database)
connect(db=MONGO_DB, host=mongo_connection_uri)

# ─── Cache & Sessions ───────────────────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://localhost:6379/0'),
    }
}

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# ─── Channels (WebSockets) ──────────────────────────────────────────────────────
# Try Redis first, fall back to in-memory for local dev without Redis
_REDIS_URL = config('REDIS_URL', default='')
if _REDIS_URL and _REDIS_URL not in ('redis://localhost:6379/0', ''):
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {'hosts': [_REDIS_URL]},
        },
    }
else:
    # Try Redis, silently fall back to InMemory if unavailable
    try:
        import redis as _redis_client
        _r = _redis_client.Redis.from_url(_REDIS_URL or 'redis://localhost:6379/0')
        _r.ping()
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels_redis.core.RedisChannelLayer',
                'CONFIG': {'hosts': [_REDIS_URL or 'redis://localhost:6379/0']},
            },
        }
    except Exception:
        # Redis not available — use in-memory (chat works within single process)
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels.layers.InMemoryChannelLayer',
            },
        }

# ─── Auth ───────────────────────────────────────────────────────────────────────
# No AUTH_USER_MODEL — we use MongoEngine User, not Django ORM User
AUTHENTICATION_BACKENDS = [
    'apps.accounts.auth_backend.MongoAuthBackend',
]

# ─── DRF ────────────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.accounts.authentication.MongoJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
}

# ─── JWT ────────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ─── CORS ───────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost,http://localhost:80,http://localhost:5173,http://127.0.0.1:5173'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# ─── Localisation ───────────────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ─── Static / Media ─────────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Email ───────────────────────────────────────────────────────────────────────
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# Use SMTP only when real credentials are set AND not a placeholder
_has_real_email = (
    EMAIL_HOST_USER
    and EMAIL_HOST_PASSWORD
    and EMAIL_HOST_USER not in ('', 'your_email@gmail.com')
    and EMAIL_HOST_PASSWORD not in ('', 'your_app_password')
)

if _has_real_email:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    # Development fallback — prints OTP to terminal AND returns it in API response
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ─── Celery ──────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://redis:6379/1')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND', default='redis://redis:6379/2')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Kolkata'

# ─── App-specific ────────────────────────────────────────────────────────────────
SUPPORT_THRESHOLD = config('SUPPORT_THRESHOLD', default=10, cast=int)

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv']

# ─── Swagger ─────────────────────────────────────────────────────────────────────
SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
        }
    },
    'USE_SESSION_AUTH': False,
}
