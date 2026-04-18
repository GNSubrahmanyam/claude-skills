# Impact: CRITICAL

## Problem

Django settings files often contain sensitive information and configuration that varies between environments. Poor settings management can lead to security breaches, deployment failures, and maintenance issues. Common problems include hardcoded secrets, environment confusion, and runtime modifications.

## Solution

Organize settings with environment-specific files:

```python
# settings/
# ├── __init__.py
# ├── base.py
# ├── development.py
# ├── production.py
# └── staging.py

# base.py - common settings
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY")
DEBUG = False
ALLOWED_HOSTS = []

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    # ... other apps
]

# development.py - development-specific settings
from .base import *

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
SECRET_KEY = "dev-secret-key-change-in-production"

# production.py - production settings
from .base import *

DEBUG = False
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

# Use environment variables for sensitive data
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["DB_NAME"],
        "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"],
        "HOST": os.environ["DB_HOST"],
        "PORT": os.environ["DB_PORT"],
    }
}
```

Use django-environ for type-safe environment variables:

```python
import environ

env = environ.Env()
environ.Env.read_env()

SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
DATABASE_URL = env.db("DATABASE_URL")
```

Set environment variables securely:

```bash
# .env file (never commit to version control)
SECRET_KEY=your-secret-key-here
DEBUG=False
DATABASE_URL=postgresql://user:pass@localhost/dbname

# Load in production
export DJANGO_SETTINGS_MODULE=myproject.settings.production
export SECRET_KEY="prod-secret"
export DATABASE_URL="postgresql://..."
```

## Common Mistakes

- Hardcoding sensitive information like SECRET_KEY or database passwords
- Using the same settings file for development and production
- Modifying settings at runtime in views or models
- Committing .env files to version control
- Not restricting settings file permissions
- Using DEBUG=True in production
- Forgetting to set ALLOWED_HOSTS in production

## When to Apply

- Setting up any Django project
- Deploying to different environments (dev, staging, production)
- Managing sensitive configuration data
- Implementing continuous deployment pipelines
- Working in team environments where settings differ