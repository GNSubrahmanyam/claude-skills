---
title: Django Containerization
impact: CRITICAL
impactDescription: Ensures reliable Django deployment in containerized environments
tags: docker, django, containerization, deployment, static-files
---

## Django Containerization

**Problem:**
Django applications require specific considerations for static files, database migrations, environment variables, and WSGI/ASGI servers when containerized. Improper containerization leads to missing static files, migration failures, and performance issues.

**Solution:**
Implement production-ready Django containerization with proper static file handling, database migrations, environment management, and optimized WSGI/ASGI server configuration.

❌ **Wrong: Basic Django containerization**
```dockerfile
FROM python:3.9
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

✅ **Correct: Production Django containerization**
```dockerfile
# ================================
# Build stage
# ================================
FROM python:3.11-slim-bookworm AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        && \
    rm -rf /var/lib/apt/lists/*

# Create virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ================================
# Production stage
# ================================
FROM python:3.11-slim-bookworm AS production

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        libpq-dev \
        && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create Django user
RUN groupadd -r django && \
    useradd -r -g django django

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set Django environment variables
ENV DJANGO_SETTINGS_MODULE=myproject.settings.production
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Create application directory
WORKDIR /app
RUN chown -R django:django /app

# Copy application code
COPY --chown=django:django . .

# Collect static files during build
RUN python manage.py collectstatic --noinput --clear

# Run database migrations (optional - can be done at runtime)
# RUN python manage.py migrate --noinput

# Create logs directory
RUN mkdir -p /app/logs && chown -R django:django /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Switch to Django user
USER django

# Expose port
EXPOSE 8000

# Use Gunicorn for production WSGI server
CMD ["gunicorn", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "sync", \
     "--worker-connections", "1000", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--access-logfile", "/app/logs/access.log", \
     "--error-logfile", "/app/logs/error.log", \
     "--log-level", "info", \
     "myproject.wsgi:application"]
```

**Django-specific considerations:**
- **Static files:** Collect during build, serve via web server
- **Database migrations:** Run at container startup or build time
- **Environment variables:** Set for production settings
- **WSGI server:** Use Gunicorn with proper worker configuration
- **Health checks:** Implement Django health check endpoints
- **Logging:** Configure proper log files and rotation

**Common mistakes:**
- Not collecting static files during build
- Running as root user
- Not setting proper environment variables
- Using development server in production
- Not implementing health checks

**When to apply:**
- Deploying Django applications to production
- Setting up Django in containerized environments
- Implementing CI/CD for Django projects
- Scaling Django applications with containers