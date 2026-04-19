---
title: Legacy Database Integration
impact: MEDIUM
impactDescription: Enables integration with existing database systems
tags: django, database, legacy, integration
---

## Legacy Database Integration

**Problem:**
Integrating Django with existing databases is complex and error-prone. Developers struggle with schema introspection, model generation, data migration, and maintaining compatibility with legacy systems. Common issues include incorrect field mappings, missing constraints, data type mismatches, and performance problems with legacy schemas.

**Solution:**
Use Django's inspectdb to generate initial models:

```python
# Generate models from existing database
python manage.py inspectdb > legacy_models.py

# Clean up and customize the generated models
# Remove unnecessary imports, fix field types, add proper Meta options
```

Configure unmanaged models for legacy tables:

```python
class LegacyUser(models.Model):
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    email = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    last_login = models.DateTimeField(null=True)

    class Meta:
        managed = False  # Don't let Django manage this table
        db_table = 'users'  # Exact table name in legacy DB
        app_label = 'legacy'
```

Handle field mapping and type conversions:

```python
class LegacyProduct(models.Model):
    # Handle different naming conventions
    product_id = models.IntegerField(primary_key=True, db_column='prod_id')
    name = models.CharField(max_length=100, db_column='prod_name')
    price = models.DecimalField(max_digits=10, decimal_places=2)

    # Handle legacy data types
    legacy_status = models.CharField(max_length=1, choices=[('A', 'Active'), ('I', 'Inactive')])

    # Handle nullable fields properly
    discontinued_date = models.DateField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'products'
```

Create data migration strategies for gradual migration:

```python
# Create a data migration to populate new tables from legacy data
def forwards(apps, schema_editor):
    LegacyUser = apps.get_model('legacy', 'LegacyUser')
    NewUser = apps.get_model('auth', 'User')

    for legacy_user in LegacyUser.objects.all():
        NewUser.objects.create(
            username=legacy_user.username,
            email=legacy_user.email,
            date_joined=legacy_user.created_at,
            last_login=legacy_user.last_login,
        )

# Use raw SQL for complex legacy data transformations
from django.db import connection

def migrate_complex_data(apps, schema_editor):
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO new_orders (user_id, total, created_at)
            SELECT u.id, SUM(oi.quantity * oi.price), NOW()
            FROM legacy_orders lo
            JOIN legacy_order_items oi ON lo.id = oi.order_id
            JOIN auth_user u ON u.username = lo.username
            GROUP BY u.id
        """)
```

Handle read-only access and data synchronization:

```python
class LegacyProductManager(models.Manager):
    def get_queryset(self):
        # Add business logic filters for legacy data
        return super().get_queryset().filter(legacy_status='A')

class LegacyProduct(models.Model):
    # Fields...

    objects = LegacyProductManager()

    @property
    def is_available(self):
        """Business logic based on legacy status"""
        return self.legacy_status == 'A' and self.discontinued_date is None
```

Implement data validation and cleanup:

```python
def clean_legacy_data():
    """Clean and validate legacy data before migration"""
    # Find data quality issues
    duplicates = LegacyUser.objects.values('email').annotate(
        count=models.Count('email')
    ).filter(count__gt=1)

    if duplicates.exists():
        print("Found duplicate emails, need manual cleanup")

    # Validate data formats
    invalid_emails = LegacyUser.objects.exclude(
        email__regex=r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    )

    if invalid_emails.exists():
        print(f"Found {invalid_emails.count()} invalid email addresses")
```

Use database views for complex legacy schemas:

```python
class ProductSummary(models.Model):
    """Django model for database view"""
    product_id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=100)
    total_sales = models.DecimalField(max_digits=12, decimal_places=2)
    last_sale_date = models.DateField()

    class Meta:
        managed = False
        db_table = 'product_sales_summary'  # Database view name
```

## Common Mistakes

- Using managed=True on legacy tables (causes schema conflicts)
- Not specifying db_column for differently named fields
- Incorrect field type mappings (especially dates, decimals)
- Missing null=True for optional fields in legacy schemas
- Not handling legacy naming conventions properly
- Assuming legacy data is clean and validated
- Not testing with production-scale data volumes
- Forgetting to handle database-specific features
- Using Django migrations on unmanaged legacy tables
- Not planning for data migration rollback scenarios

## When to Apply

- Working with existing database schemas
- Brownfield application development
- Gradual migration from legacy systems
- Integrating Django with enterprise databases
- Creating read-only interfaces to legacy data
- Building APIs on top of existing databases
- Data warehouse and reporting applications