# Deployment Secret Management (MEDIUM)

**Impact:** MEDIUM - Protects sensitive configuration and prevents security breaches

**Problem:**
Hardcoded secrets in code or configuration files lead to security breaches when repositories are compromised or files are accidentally exposed.

**Solution:**
Use secure secret management with environment variables, secret files, or dedicated secret management services.

**Examples:**

❌ **Wrong: Hardcoded secrets**
```python
# settings.py - DANGEROUS!
SECRET_KEY = 'my-super-secret-key-that-everyone-can-see'
DATABASE_PASSWORD = 'admin123'
AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE'
AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'

# API keys exposed
STRIPE_PUBLISHABLE_KEY = 'pk_live_1234567890'
STRIPE_SECRET_KEY = 'sk_live_1234567890'

# OAuth secrets
GOOGLE_CLIENT_SECRET = 'GOCSPX-abc123def456'
```

✅ **Correct: Secure secret management**
```python
# settings.py - Secure
import os
from pathlib import Path

# Secret key with fallback for development
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if os.environ.get('DJANGO_ENV') == 'development':
        SECRET_KEY = 'dev-secret-key-change-in-production'
    else:
        raise ValueError('DJANGO_SECRET_KEY environment variable must be set')

# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
    }
}

# AWS credentials
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')

# Payment processing
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')

# OAuth credentials
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')

# API keys
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SENTRY_DSN = os.environ.get('SENTRY_DSN')
```

**Environment File Management:**
```python
# .env.example (committed to repo)
# Copy this file to .env and fill in your actual values
# NEVER commit .env to version control!

DJANGO_SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=myapp
DB_USER=myapp_user
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=

# Payment
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=

# Email
SENDGRID_API_KEY=

# Monitoring
SENTRY_DSN=

# .env (actual secrets - NEVER commit!)
DJANGO_SECRET_KEY=super-secret-production-key-here
DEBUG=False
ALLOWED_HOSTS=example.com,www.example.com
DB_PASSWORD=my_secure_db_password_123
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
STRIPE_SECRET_KEY=sk_live_1234567890abcdef
SENDGRID_API_KEY=SG.1234567890abcdef
SENTRY_DSN=https://1234567890abcdef@sentry.io/1234567
```

**Secret File Approach:**
```python
# settings.py - Reading from secret files
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

def get_secret(secret_name, default=None):
    """Read secret from file or environment"""
    # First try environment variable
    value = os.environ.get(secret_name)
    if value:
        return value

    # Then try secret file
    secret_file = BASE_DIR / 'secrets' / secret_name.lower()
    if secret_file.exists():
        return secret_file.read_text().strip()

    # Return default or raise error
    if default is not None:
        return default

    raise ValueError(f'Secret {secret_name} not found in environment or secrets directory')

# Usage
SECRET_KEY = get_secret('DJANGO_SECRET_KEY')
DB_PASSWORD = get_secret('DB_PASSWORD')
AWS_SECRET_ACCESS_KEY = get_secret('AWS_SECRET_ACCESS_KEY')

# secrets/ directory structure
# secrets/
# ├── django_secret_key
# ├── db_password
# ├── aws_secret_access_key
# ├── stripe_secret_key
# └── sentry_dsn

# File permissions
# chmod 600 secrets/*
# chown www-data:www-data secrets/*
```

**Advanced Secret Management:**
```python
# Using python-decouple for cleaner syntax
from decouple import config, Csv

# settings.py
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST'),
        'PORT': config('DB_PORT', cast=int),
    }
}

# Using AWS Secrets Manager or similar
import boto3
from botocore.exceptions import ClientError

def get_aws_secret(secret_name, region_name='us-east-1'):
    """Retrieve secret from AWS Secrets Manager"""
    client = boto3.client('secretsmanager', region_name=region_name)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        return response['SecretString']
    except ClientError as e:
        raise ValueError(f"Could not retrieve secret {secret_name}: {e}")

# Usage
STRIPE_SECRET_KEY = get_aws_secret('stripe/secret_key')
DB_PASSWORD = get_aws_secret('database/password')

# Using HashiCorp Vault
import hvac

def get_vault_secret(path, key):
    """Retrieve secret from HashiCorp Vault"""
    client = hvac.Client(url=os.environ['VAULT_ADDR'])
    client.auth.approle.login(
        role_id=os.environ['VAULT_ROLE_ID'],
        secret_id=os.environ['VAULT_SECRET_ID']
    )

    response = client.read(path)
    return response['data'][key]

# Usage
SECRET_KEY = get_vault_secret('secret/django', 'secret_key')
```

**Secret Rotation and Validation:**
```python
# settings.py - Secret validation and rotation
import re
from django.core.exceptions import ImproperlyConfigured

def validate_secret_key(key):
    """Validate Django secret key format"""
    if not key or len(key) < 50:
        raise ImproperlyConfigured('SECRET_KEY must be at least 50 characters long')

    # Check for common weak patterns
    weak_patterns = [
        r'password', r'admin', r'user', r'login',
        r'test', r'dev', r'debug', r'sample'
    ]

    if any(re.search(pattern, key.lower()) for pattern in weak_patterns):
        raise ImproperlyConfigured('SECRET_KEY contains weak patterns')

    return key

SECRET_KEY = validate_secret_key(get_secret('DJANGO_SECRET_KEY'))

# Password validation for database
def validate_db_password(password):
    """Validate database password strength"""
    if not password:
        raise ImproperlyConfigured('Database password is required')

    if len(password) < 12:
        raise ImproperlyConfigured('Database password must be at least 12 characters')

    # Check for required character types
    if not re.search(r'[A-Z]', password):
        raise ImproperlyConfigured('Database password must contain uppercase letters')

    if not re.search(r'[a-z]', password):
        raise ImproperlyConfigured('Database password must contain lowercase letters')

    if not re.search(r'\d', password):
        raise ImproperlyConfigured('Database password must contain digits')

    return password

DB_PASSWORD = validate_db_password(get_secret('DB_PASSWORD'))

# Secret rotation helper
def rotate_secret(secret_name, new_value):
    """Rotate a secret value"""
    # Update environment or secret store
    os.environ[secret_name] = new_value

    # For file-based secrets
    secret_file = BASE_DIR / 'secrets' / secret_name.lower()
    secret_file.write_text(new_value)
    secret_file.chmod(0o600)

    # Log rotation
    logger.info(f'Secret {secret_name} rotated successfully')
```

**Common mistakes:**
- Committing secrets to version control
- Using weak or default secret values
- Not rotating secrets regularly
- Exposing secrets in logs or error messages
- Missing secret validation
- Using same secrets across environments

**When to apply:**
- Setting up production deployments
- Implementing security best practices
- Preparing for compliance audits
- During infrastructure setup
- When handling sensitive data