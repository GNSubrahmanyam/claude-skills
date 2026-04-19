# Impact: HIGH

## Problem

Multi-database configurations in Django are complex and error-prone. Developers often struggle with database routing, migration synchronization, cross-database relationships, and ensuring data consistency. Incorrect setup can lead to data corruption, performance issues, and application crashes.

## Solution

Configure multiple databases in settings with proper aliases:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'primary_db',
        'USER': 'db_user',
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': 'localhost',
        'PORT': '5432',
    },
    'analytics': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'analytics_db',
        'USER': 'analytics_user',
        'PASSWORD': os.environ['ANALYTICS_DB_PASSWORD'],
        'HOST': 'analytics.example.com',
        'PORT': '5432',
    }
}
```

Create database routers to control data routing:

```python
class AnalyticsRouter:
    route_app_labels = {'analytics', 'reporting'}

    def db_for_read(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return 'analytics'
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label in self.route_app_labels:
            return 'analytics'
        return None

    def allow_relation(self, obj1, obj2, **hints):
        # Prevent cross-database relations
        if (obj1._meta.app_label in self.route_app_labels and
            obj2._meta.app_label not in self.route_app_labels):
            return False
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label in self.route_app_labels:
            return db == 'analytics'
        return None
```

Register routers in settings:

```python
DATABASE_ROUTERS = [
    'myapp.routers.AnalyticsRouter',
]
```

Use manual database selection when needed:

```python
# Query specific database
analytics_data = AnalyticsModel.objects.using('analytics').all()

# Save to specific database
user = User(username='john')
user.save(using='users_db')

# Raw queries on specific database
from django.db import connections
with connections['analytics'].cursor() as cursor:
    cursor.execute("SELECT COUNT(*) FROM analytics_events")
```

Handle migrations properly:

```bash
# Migrate all databases
python manage.py migrate
python manage.py migrate --database=analytics

# Create migrations for specific database
python manage.py makemigrations --database=analytics
```

## Common Mistakes

- Forgetting to run migrations on all databases
- Creating cross-database foreign key relationships
- Not configuring routers for contrib apps that need to be together
- Using default database for everything and defeating multi-db purpose
- Not handling instance._state.db when moving objects between databases
- Assuming all databases use the same schema
- Not testing multi-database scenarios
- Using routers that allow cross-database relations without referential integrity

## When to Apply

- Implementing read/write database splitting for performance
- Isolating analytics/reporting data from transactional data
- Integrating with legacy databases
- Multi-tenant applications with separate databases per tenant
- High-traffic applications requiring database sharding
- Separating sensitive data into secure databases
- Implementing database failover or backup strategies