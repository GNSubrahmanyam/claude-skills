# Static Files & Media Management

This reference covers Django static files and media file handling, including development and production configurations.

## Static Files Configuration

### Development Settings

```python
# settings.py (development)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Static files directories
STATICFILES_DIRS = [
    BASE_DIR / 'static',
    BASE_DIR / 'assets',
]

# Finders
STATICFILES_FINDERS = [
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
]

# Development server serves static files automatically
# python manage.py runserver
```

### Production Settings

```python
# settings.py (production)
STATIC_URL = 'https://cdn.example.com/static/'
STATIC_ROOT = '/var/www/static/'

# Use WhiteNoise for simple deployments
MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ... other middleware
]

STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Or use CloudFront/S3
AWS_S3_CUSTOM_DOMAIN = 'cdn.example.com'
AWS_STORAGE_BUCKET_NAME = 'my-static-files'
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

## Template Static File Usage

```django
<!-- templates/base.html -->
{% load static %}

<!DOCTYPE html>
<html>
<head>
    <!-- CSS files -->
    <link rel="stylesheet" href="{% static 'css/bootstrap.min.css' %}">
    <link rel="stylesheet" href="{% static 'css/style.css' %}">

    <!-- JavaScript files -->
    <script src="{% static 'js/jquery.min.js' %}"></script>
    <script src="{% static 'js/app.js' %}"></script>

    <!-- Images -->
    <link rel="icon" href="{% static 'images/favicon.ico' %}">
</head>
<body>
    <img src="{% static 'images/logo.png' %}" alt="Logo">

    <!-- Dynamic static paths -->
    <link rel="stylesheet" href="{% static 'css/themes/'|add:theme|add:'.css' %}">
</body>
</html>
```

## Media Files Handling

```python
# settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# For production with S3
AWS_S3_CUSTOM_DOMAIN = 'media.example.com'
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

### File Upload Views

```python
from django.core.files.storage import default_storage
from django.conf import settings

def upload_file(request):
    if request.method == 'POST' and request.FILES['file']:
        uploaded_file = request.FILES['file']

        # Basic validation
        if uploaded_file.size > 10 * 1024 * 1024:  # 10MB
            return JsonResponse({'error': 'File too large'})

        allowed_types = ['image/jpeg', 'image/png', 'application/pdf']
        if uploaded_file.content_type not in allowed_types:
            return JsonResponse({'error': 'File type not allowed'})

        # Save file
        file_name = default_storage.save(
            f'uploads/{uploaded_file.name}',
            uploaded_file
        )

        # Create model instance
        document = Document.objects.create(
            title=request.POST.get('title'),
            file=file_name,
            uploaded_by=request.user
        )

        return JsonResponse({
            'id': document.id,
            'url': document.file.url
        })

    return render(request, 'upload.html')
```

### File Serving in Development

```python
# urls.py (development only)
from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
```

## File Storage Backends

### Local Filesystem

```python
# Default local storage
class LocalFileStorage:
    """Default Django storage"""
    pass

# Custom storage for organization
from django.core.files.storage import FileSystemStorage

class OrganizedStorage(FileSystemStorage):
    """Organize files by date"""

    def get_valid_filename(self, name):
        # Organize files in date-based directories
        from datetime import datetime
        now = datetime.now()
        return f"{now.year}/{now.month:02d}/{now.day:02d}/{name}"
```

### Cloud Storage (S3)

```python
# settings.py for S3
INSTALLED_APPS = [
    'storages',
    # ... other apps
]

AWS_ACCESS_KEY_ID = os.environ['AWS_ACCESS_KEY_ID']
AWS_SECRET_ACCESS_KEY = os.environ['AWS_SECRET_ACCESS_KEY']
AWS_STORAGE_BUCKET_NAME = 'my-django-files'
AWS_S3_REGION_NAME = 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'

# Static files
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'

# Media files
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'
```

## Deployment Checklist

### Pre-deployment Tasks

```bash
# 1. Collect static files
python manage.py collectstatic --noinput

# 2. Run tests
python manage.py test

# 3. Check for migrations
python manage.py makemigrations --check

# 4. Run security check
python manage.py check --deploy

# 5. Create backup
python manage.py dumpdata > backup.json
```

### Production Server Configuration

#### Nginx Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name example.com www.example.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Static files
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /var/www/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # Django application
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Gunicorn Configuration

```python
# gunicorn.conf.py
bind = '127.0.0.1:8000'
workers = 3
worker_class = 'sync'
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30
keepalive = 2

# Logging
loglevel = 'info'
accesslog = '/var/log/gunicorn/access.log'
errorlog = '/var/log/gunicorn/error.log'
```

#### systemd Service

```ini
# /etc/systemd/system/gunicorn.service
[Unit]
Description=gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/myproject
Environment="PATH=/var/www/myproject/env/bin"
ExecStart=/var/www/myproject/env/bin/gunicorn --config gunicorn.conf.py myproject.wsgi:application

[Install]
WantedBy=multi-user.target
```

### Environment Variables

```bash
# .env file
DEBUG=False
SECRET_KEY=your-production-secret-key
DATABASE_URL=postgres://user:password@localhost/dbname
REDIS_URL=redis://localhost:6379/1
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

### SSL/TLS Configuration

```nginx
# nginx.conf (HTTPS)
server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}
```

### Monitoring & Logging

```python
# settings.py logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/myproject.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

### Performance Optimization

```python
# settings.py production optimizations
# Database connection pooling
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # 10 minutes
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# Cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# Session configuration
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Compression
MIDDLEWARE = [
    'django.middleware.gzip.GZipMiddleware',
    # ... other middleware
]
```