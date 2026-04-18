# Hot Reloading Development (MEDIUM)

**Impact:** MEDIUM - Enables fast development iteration cycles

**Problem:**
Development workflows are slow without hot reloading, requiring manual container rebuilds and restarts for code changes. This breaks development productivity and increases iteration time.

**Solution:**
Configure development containers with volume mounting and hot reloading for fast iteration cycles, while maintaining production-like environments.

❌ **Wrong: Slow development cycle**
```bash
# Edit code
# Stop container
docker-compose down
# Rebuild image
docker-compose build
# Restart services
docker-compose up -d
# Test changes - takes 2-3 minutes
```

✅ **Correct: Fast hot reloading development**
```yaml
version: '3.8'

services:
  # Django with hot reloading
  django:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      # Mount source code
      - ./backend:/app
      # Exclude cache files
      - /app/__pycache__
      - /app/**/*.pyc
      - /app/.pytest_cache
      - /app/staticfiles
      # Exclude virtual environment
      - /app/venv
    ports:
      - "8000:8000"
    environment:
      - DEBUG=1
      - DJANGO_SETTINGS_MODULE=config.settings.development
      - USE_DOCKER=1
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: python manage.py runserver 0.0.0.0:8000
    networks:
      - app_network

  # FastAPI with hot reloading
  fastapi:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    volumes:
      - ./api:/app
      - /app/__pycache__
      - /app/.pytest_cache
    ports:
      - "8001:8000"
    environment:
      - DEBUG=1
      - ENVIRONMENT=development
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload --reload-dir /app
    networks:
      - app_network

  # React frontend with hot reloading
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REACT_APP_API_URL=http://localhost:8001
    command: npm run dev
    networks:
      - app_network

  # Celery worker with code reloading
  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile.worker
    volumes:
      - ./backend:/app
      - /app/__pycache__
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
    depends_on:
      redis:
        condition: service_healthy
    command: celery -A config worker -l info --autoreload
    networks:
      - app_network

  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=myapp_dev
      - POSTGRES_USER=dev
      - POSTGRES_PASSWORD=dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev -d myapp_dev"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app_network

  # Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    networks:
      - app_network

volumes:
  postgres_data:
  redis_data:

networks:
  app_network:
    driver: bridge
```

**Development Dockerfile examples:**
```dockerfile
# Django development Dockerfile
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python dependencies
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

# Install Django development server
RUN pip install --no-cache-dir django-debug-toolbar django-extensions werkzeug

# Create app user
RUN useradd --create-home --shell /bin/bash app

# Set working directory
WORKDIR /app

# Change ownership
RUN chown -R app:app /app

# Switch to app user
USER app

# Default command (overridden by docker-compose)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

**Hot reloading configuration:**
```python
# Django settings for development
# config/settings/development.py
from .base import *

DEBUG = True
SECRET_KEY = 'dev-secret-key-change-in-production'

# Development-specific apps
INSTALLED_APPS += [
    'django_extensions',
    'debug_toolbar',
]

# Debug toolbar
INTERNAL_IPS = ['127.0.0.1', 'localhost']

MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')

# Database for development
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'myapp_dev',
        'USER': 'dev',
        'PASSWORD': 'dev',
        'HOST': 'postgres',
        'PORT': '5432',
    }
}

# Redis cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = '/app/staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = '/app/media'
```

**Development tooling:**
```yaml
# Additional development services
services:
  # pgAdmin for database management
  pgadmin:
    image: dpage/pgadmin4
    environment:
      - PGADMIN_DEFAULT_EMAIL=dev@company.com
      - PGADMIN_DEFAULT_PASSWORD=dev
    ports:
      - "5050:80"
    depends_on:
      - postgres
    networks:
      - app_network
    profiles: ["tools"]

  # Redis Commander for cache inspection
  redis-commander:
    image: rediscommander/redis-commander:latest
    environment:
      - REDIS_HOSTS=local:redis:6379
    ports:
      - "8081:8081"
    depends_on:
      - redis
    networks:
      - app_network
    profiles: ["tools"]

  # Flower for Celery monitoring
  flower:
    image: mher/flower
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - FLOWER_BASIC_AUTH=dev:dev
    ports:
      - "5555:5555"
    depends_on:
      - redis
      - celery
    networks:
      - app_network
    profiles: ["tools"]
```

**Development workflow optimization:**
```bash
# Development commands
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f django

# Run Django migrations
docker-compose exec django python manage.py migrate

# Run tests
docker-compose exec django python manage.py test

# Create superuser
docker-compose exec django python manage.py createsuperuser

# Access Django shell
docker-compose exec django python manage.py shell

# Run FastAPI tests
docker-compose exec fastapi pytest tests/

# Restart specific service
docker-compose restart django

# Rebuild and restart
docker-compose up -d --build django

# Clean up
docker-compose down -v --remove-orphans
```

**Advanced development features:**
```yaml
# VS Code development container
# .devcontainer/devcontainer.json
{
  "name": "Django FastAPI Development",
  "dockerComposeFile": [
    "../docker-compose.yml",
    "docker-compose.dev.yml"
  ],
  "service": "django",
  "workspaceFolder": "/app",
  "shutdownAction": "stopCompose",

  "extensions": [
    "ms-python.python",
    "ms-python.debugpy",
    "ms-python.black-formatter",
    "ms-python.flake8",
    "ms-toolsai.jupyter"
  ],

  "settings": {
    "python.defaultInterpreterPath": "/opt/venv/bin/python",
    "python.linting.enabled": true,
    "python.formatting.provider": "black"
  },

  "postCreateCommand": "pip install -e .",

  "remoteUser": "app"
}
```

**Performance monitoring in development:**
```python
# Django debug toolbar configuration
# config/settings/development.py
if DEBUG:
    import debug_toolbar
    INSTALLED_APPS.append('debug_toolbar')
    MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')

    DEBUG_TOOLBAR_CONFIG = {
        'SHOW_COLLAPSED': True,
        'SQL_WARNING_THRESHOLD': 100,
    }
```

**Common mistakes:**
- Not excluding cache files from volume mounts
- Using production settings in development
- Not configuring hot reloading properly
- Missing development dependencies
- Not isolating development databases

**When to apply:**
- Local development environments
- Team development setups
- CI/CD development pipelines
- Debugging and troubleshooting
- Rapid prototyping and iteration