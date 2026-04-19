---
title: Docker Compose Development
impact: HIGH
impactDescription: Enables consistent multi-service development environments
tags: docker, compose, development, multi-service, environments
---

## Docker Compose Development

**Problem:**
Modern applications consist of multiple services (web app, API, database, cache, background workers). Managing these services individually leads to environment inconsistencies, complex setup processes, and development friction.

**Solution:**
Use Docker Compose to orchestrate multi-service development environments with proper service dependencies, networking, and volume management.

❌ **Wrong: Manual service management**
```bash
# Manual startup - error-prone and inconsistent
# Terminal 1: Start PostgreSQL
docker run -d --name postgres -p 5432:5432 postgres:13

# Terminal 2: Start Redis
docker run -d --name redis -p 6379:6379 redis:7

# Terminal 3: Start Django app
cd django-app && python manage.py runserver

# Terminal 4: Start FastAPI service
cd fastapi-service && uvicorn main:app --reload

# Terminal 5: Start Celery worker
cd django-app && celery -A myproject worker -l info
```

✅ **Correct: Docker Compose orchestration**
```yaml
# docker-compose.yml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: myapp_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  # Django web application
  django:
    build:
      context: ./django-app
      dockerfile: Dockerfile.dev
    volumes:
      - ./django-app:/app
      - /app/__pycache__
      - django_static:/app/staticfiles
    ports:
      - "8000:8000"
    environment:
      - DEBUG=1
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/myapp_dev
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: python manage.py runserver 0.0.0.0:8000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 30s
      timeout: 10s
      retries: 3

  # FastAPI service
  fastapi:
    build:
      context: ./fastapi-service
      dockerfile: Dockerfile.dev
    volumes:
      - ./fastapi-service:/app
      - /app/__pycache__
    ports:
      - "8001:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/myapp_dev
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Celery worker
  celery:
    build:
      context: ./django-app
      dockerfile: Dockerfile.worker
    volumes:
      - ./django-app:/app
      - /app/__pycache__
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/myapp_dev
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: celery -A myproject worker -l info --concurrency 2
    healthcheck:
      test: ["CMD", "celery", "-A", "myproject", "inspect", "ping"]
      interval: 60s
      timeout: 10s
      retries: 3

  # Celery beat scheduler
  celery-beat:
    build:
      context: ./django-app
      dockerfile: Dockerfile.worker
    volumes:
      - ./django-app:/app
      - /app/__pycache__
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/myapp_dev
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: celery -A myproject beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    profiles: ["beat"]  # Optional service

volumes:
  postgres_data:
  redis_data:
  django_static:

networks:
  default:
    driver: bridge
```

**Development workflow:**
```bash
# Start all services
docker-compose up -d

# Start with beat scheduler
docker-compose --profile beat up -d

# View logs
docker-compose logs -f django

# Run Django migrations
docker-compose exec django python manage.py migrate

# Run tests
docker-compose exec django python manage.py test

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

**Common mistakes:**
- Not using health checks for service dependencies
- Improper volume mounting causing permission issues
- Missing environment variable configuration
- Not handling service startup order correctly
- Using host networking instead of proper service discovery

**When to apply:**
- Multi-service application development
- Maintaining consistent development environments
- Onboarding new team members quickly
- Testing service integrations
- CI/CD pipeline development