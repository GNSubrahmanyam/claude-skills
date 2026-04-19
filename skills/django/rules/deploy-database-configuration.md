---
title: Deployment Database Configuration
impact: MEDIUM
impactDescription: Ensures database performance and reliability in production
tags: django, deployment, database, configuration, performance
---

## Deployment Database Configuration

**Problem:**
Default database settings cause performance issues, connection problems, and reliability issues in production. Improper database configuration can lead to slow queries, connection pool exhaustion, and data corruption.

**Solution:**
Configure database settings appropriately for production with connection pooling, proper timeouts, and performance optimizations.

**Examples:**

❌ **Wrong: Default database settings**
```python
# settings.py - Poor for production
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'myapp',
        'USER': 'user',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
        # Missing critical production settings!
    }
}

# No connection pooling
# No timeouts
# No performance optimizations
```

✅ **Correct: Production database configuration**
```python
# settings.py - Production database config
import os

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT', '5432'),

        # Connection pooling and timeouts
        'CONN_MAX_AGE': 600,  # 10 minutes - reuse connections
        'CONN_HEALTH_CHECKS': True,  # Django 4.1+
        'OPTIONS': {
            'connect_timeout': 10,  # Connection timeout
            'options': '-c statement_timeout=30000ms',  # Query timeout 30s
            'options': '-c idle_in_transaction_session_timeout=300000ms',  # 5min
        },

        # Connection pool settings for high traffic
        'POOL_OPTIONS': {
            'POOL_SIZE': 10,  # Connection pool size
            'MAX_OVERFLOW': 20,  # Additional connections allowed
            'RECYCLE': 3600,  # Recycle connections after 1 hour
        },

        # SSL for security
        'OPTIONS': {
            **DATABASES['default'].get('OPTIONS', {}),
            'sslmode': 'require',  # Require SSL connection
        },
    }
}

# For read/write splitting (advanced)
DATABASES = {
    'default': {
        # Primary database for writes
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST'),
        'PORT': os.environ.get('DB_PORT'),
        'CONN_MAX_AGE': 600,
    },
    'replica': {
        # Read replica for queries
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME'),
        'USER': os.environ.get('DB_USER'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('REPLICA_HOST'),
        'PORT': os.environ.get('DB_PORT'),
        'CONN_MAX_AGE': 600,
        'TEST': {
            'MIRROR': 'default',  # Use same data for tests
        },
    }
}

# Database routers for read/write splitting
class PrimaryReplicaRouter:
    """Route reads to replica, writes to primary"""

    def db_for_read(self, model, **hints):
        return 'replica'

    def db_for_write(self, model, **hints):
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        # Allow relations between objects in same database
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # Only allow migrations on primary
        return db == 'default'
```

**Database Connection Management:**
```python
# settings.py - Advanced connection management
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 600,  # Connection reuse
        'CONN_HEALTH_CHECKS': True,
        'AUTOCOMMIT': True,  # Explicit transaction management
        'ATOMIC_REQUESTS': False,  # Handle transactions manually
        'OPTIONS': {
            'connect_timeout': 10,
            'statement_timeout': 30000,  # 30 second query timeout
            'idle_in_transaction_session_timeout': 300000,  # 5 minutes
            'tcp_user_timeout': 60000,  # 1 minute TCP timeout
        },
        # Connection pool (if using django-db-pool)
        'POOL_OPTIONS': {
            'POOL_SIZE': 10,
            'MAX_OVERFLOW': 20,
            'RECYCLE': 3600,
        },
    }
}

# Database-specific optimizations
if DATABASES['default']['ENGINE'] == 'django.db.backends.postgresql':
    DATABASES['default']['OPTIONS'].update({
        'options': '-c default_transaction_isolation=read_committed',
        'options': '-c timezone=UTC',
        'options': '-c work_mem=64MB',  # Memory for operations
        'options': '-c maintenance_work_mem=256MB',  # Maintenance operations
    })

elif DATABASES['default']['ENGINE'] == 'django.db.backends.mysql':
    DATABASES['default']['OPTIONS'].update({
        'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        'charset': 'utf8mb4',
        'autocommit': True,
    })
```

**Database Monitoring and Health Checks:**
```python
# health_checks.py - Database health monitoring
from django.db import connections
from django.db.utils import OperationalError
import time

def check_database_health():
    """Check database connectivity and performance"""
    db_health = {}

    for db_alias in connections:
        try:
            connection = connections[db_alias]
            start_time = time.time()

            # Test connection with simple query
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()

            response_time = time.time() - start_time

            db_health[db_alias] = {
                'status': 'healthy' if result and result[0] == 1 else 'unhealthy',
                'response_time': response_time,
                'connection_count': len(connection.queries) if hasattr(connection, 'queries') else 0,
            }

        except OperationalError as e:
            db_health[db_alias] = {
                'status': 'unhealthy',
                'error': str(e),
                'response_time': None,
            }

    return db_health

# Django health check endpoint
from django.http import JsonResponse

def db_health_check(request):
    """API endpoint for database health checks"""
    health = check_database_health()

    # Return 503 if any database is unhealthy
    if any(db['status'] != 'healthy' for db in health.values()):
        return JsonResponse(health, status=503)

    return JsonResponse(health)

# Middleware for database monitoring
class DatabaseMonitoringMiddleware:
    """Monitor database query performance"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Log slow queries
        from django.db import connection
        for query in connection.queries:
            if float(query['time']) > 1.0:  # Queries taking > 1 second
                logger.warning(f"Slow query ({query['time']}s): {query['sql']}")

        return response
```

**Database Backup Configuration:**
```python
# settings.py - Backup configuration
DB_BACKUP_CONFIG = {
    'schedule': 'daily',  # daily, weekly, monthly
    'retention_days': 30,
    'compression': 'gzip',
    'encryption': True,
    'remote_storage': {
        'provider': 's3',
        'bucket': os.environ.get('BACKUP_BUCKET'),
        'region': os.environ.get('AWS_REGION'),
    }
}

# Automated backup management
import boto3
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Create database backup'

    def handle(self, *args, **options):
        # Create backup
        backup_file = self.create_backup()

        # Upload to S3
        self.upload_to_s3(backup_file)

        # Cleanup old backups
        self.cleanup_old_backups()

    def create_backup(self):
        """Create database backup"""
        from django.core.management import call_command
        from django.conf import settings

        backup_file = f"/tmp/backup_{settings.DB_NAME}_{timezone.now().date()}.sql"

        # Use pg_dump for PostgreSQL
        import subprocess
        subprocess.run([
            'pg_dump',
            f'--host={settings.DB_HOST}',
            f'--username={settings.DB_USER}',
            f'--dbname={settings.DB_NAME}',
            f'--file={backup_file}',
            '--format=custom',  # Compressed format
        ], env={'PGPASSWORD': settings.DB_PASSWORD})

        return backup_file

    def upload_to_s3(self, backup_file):
        """Upload backup to S3"""
        s3 = boto3.client('s3')
        bucket = os.environ['BACKUP_BUCKET']

        s3.upload_file(
            backup_file,
            bucket,
            f"backups/{os.path.basename(backup_file)}"
        )
```

**Common mistakes:**
- Using default database settings in production
- Not configuring connection pooling
- Missing query timeouts
- Not monitoring database performance
- Skipping database backups
- Using wrong database engine settings

**When to apply:**
- Configuring production databases
- Setting up database connection pooling
- Implementing database monitoring
- During performance optimization
- Preparing for database maintenance