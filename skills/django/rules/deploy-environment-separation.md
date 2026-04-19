# Deployment Environment Separation (MEDIUM)

**Impact:** MEDIUM - Prevents configuration conflicts and security issues

**Problem:**
Same configuration for development and production leads to security risks, performance issues, and debugging difficulties. Environment-specific settings get mixed up causing deployment failures.

**Solution:**
Maintain separate settings for each environment with environment variables and proper configuration management.

**Examples:**

❌ **Wrong: Single settings file**
```python
# settings.py - DANGEROUS: Same config for all environments
DEBUG = True  # Dangerous in production!
SECRET_KEY = 'insecure-secret-key'  # Exposed!

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',  # SQLite in production?
    }
}

# Same email config for all environments
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'  # No emails in production!

ALLOWED_HOSTS = ['localhost', '127.0.0.1']  # Missing production domains
```

✅ **Correct: Environment-based configuration**
```python
# settings/__init__.py
import os
from pathlib import Path

# Determine environment
ENVIRONMENT = os.environ.get('DJANGO_ENV', 'development')
BASE_DIR = Path(__file__).resolve().parent.parent

# Import environment-specific settings
if ENVIRONMENT == 'production':
    from .production import *
elif ENVIRONMENT == 'staging':
    from .staging import *
elif ENVIRONMENT == 'testing':
    from .testing import *
else:
    from .development import *

# settings/base.py - Shared settings
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if ENVIRONMENT == 'development':
        SECRET_KEY = 'dev-secret-key-change-in-production'
    else:
        raise ValueError('DJANGO_SECRET_KEY environment variable must be set')

DEBUG = ENVIRONMENT == 'development'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Database configuration
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    # Parse database URL (use dj-database-url)
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(default=DATABASE_URL)
    }
else:
    # Fallback for development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Email configuration
EMAIL_CONFIG = {
    'development': {
        'BACKEND': 'django.core.mail.backends.console.EmailBackend',
    },
    'staging': {
        'BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
        'HOST': 'smtp.mailgun.org',
        'PORT': 587,
        'USE_TLS': True,
        'USERNAME': os.environ.get('MAILGUN_USERNAME'),
        'PASSWORD': os.environ.get('MAILGUN_PASSWORD'),
    },
    'production': {
        'BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
        'HOST': 'smtp.sendgrid.net',
        'PORT': 587,
        'USE_TLS': True,
        'USERNAME': os.environ.get('SENDGRID_USERNAME'),
        'PASSWORD': os.environ.get('SENDGRID_PASSWORD'),
    }
}

email_settings = EMAIL_CONFIG.get(ENVIRONMENT, EMAIL_CONFIG['development'])
vars().update(email_settings)

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO' if ENVIRONMENT == 'development' else 'WARNING',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / f'{ENVIRONMENT}.log',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}

# settings/development.py
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

# Development-specific apps
INSTALLED_APPS += [
    'debug_toolbar',
    'django_extensions',
]

MIDDLEWARE += [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# Development database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'myapp_dev',
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# settings/production.py
from .base import *

DEBUG = False
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Security settings
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Performance settings
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/1'),
    }
}

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'

# Production database
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600
    )
}

# Static files
STATIC_URL = os.environ.get('STATIC_URL', 'https://cdn.example.com/static/')
STATICFILES_STORAGE = 'myapp.storage.OptimizedStaticFilesStorage'

# Error reporting
import sentry_sdk
sentry_sdk.init(dsn=os.environ.get('SENTRY_DSN'))
```

**Environment Variables Management:**
```bash
# .env.example
# Copy this to .env and fill in your values

# Django settings
DJANGO_ENV=development
DJANGO_SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/myapp

# Email
MAILGUN_USERNAME=postmaster@sandbox.mailgun.org
MAILGUN_PASSWORD=your-mailgun-password

# External services
REDIS_URL=redis://localhost:6379/1
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# .env (actual values - never commit!)
DJANGO_ENV=production
DJANGO_SECRET_KEY=super-secret-production-key
DEBUG=False
ALLOWED_HOSTS=example.com,www.example.com,api.example.com
DATABASE_URL=postgresql://prod_user:prod_password@prod-host:5432/prod_db
REDIS_URL=redis://prod-redis:6379/1
SENTRY_DSN=https://prod-sentry-dsn@sentry.io/prod-project
```

**Configuration Management:**
```python
# config/settings.py - Alternative approach
import os
from pathlib import Path

class Config:
    """Configuration management class"""

    def __init__(self):
        self.env = os.environ.get('DJANGO_ENV', 'development')
        self.base_dir = Path(__file__).resolve().parent.parent

    def __call__(self):
        """Return settings dictionary"""
        settings = {
            'SECRET_KEY': self._get_secret('DJANGO_SECRET_KEY'),
            'DEBUG': self.env == 'development',
            'ALLOWED_HOSTS': self._get_list('ALLOWED_HOSTS'),
            'DATABASES': self._get_databases(),
            'CACHES': self._get_caches(),
            # ... other settings
        }
        return settings

    def _get_secret(self, key, default=None):
        """Get secret with validation"""
        value = os.environ.get(key, default)
        if not value and self.env != 'development':
            raise ValueError(f'Required environment variable {key} not set')
        return value

    def _get_list(self, key, default=''):
        """Get comma-separated list"""
        value = os.environ.get(key, default)
        return [item.strip() for item in value.split(',') if item.strip()]

    def _get_databases(self):
        """Configure databases"""
        if self.env == 'development':
            return {
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': self.base_dir / 'db.sqlite3',
                }
            }
        else:
            import dj_database_url
            return {
                'default': dj_database_url.config(
                    default=os.environ.get('DATABASE_URL')
                )
            }

    def _get_caches(self):
        """Configure caches"""
        if self.env == 'development':
            return {
                'default': {
                    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                }
            }
        else:
            return {
                'default': {
                    'BACKEND': 'django.core.cache.backends.redis.RedisCache',
                    'LOCATION': os.environ.get('REDIS_URL'),
                }
            }

# Usage
config = Config()
settings = config()
globals().update(settings)
```

**Common mistakes:**
- Using same settings for all environments
- Hardcoding sensitive values
- Missing environment variable validation
- Not using different databases per environment
- Exposing debug information in production
- Inconsistent logging between environments

**When to apply:**
- Setting up new Django projects
- Preparing for production deployment
- Managing multiple environments (dev/staging/prod)
- Implementing CI/CD pipelines
- During infrastructure setup