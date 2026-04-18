# Impact: MEDIUM

## Problem

Django's ORM is powerful but sometimes insufficient for complex queries, performance optimization, or database-specific features. Developers using raw SQL often introduce security vulnerabilities, performance issues, or maintenance problems due to improper parameterization, lack of transactions, or failure to integrate with Django's features.

## Solution

Use raw SQL only when ORM cannot meet performance or functionality requirements. Always prioritize security and proper integration.

Use Manager.raw() for queries that return model instances:

```python
class Person(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    birth_date = models.DateField()

# Safe parameterized query
def search_people(last_name):
    return Person.objects.raw("""
        SELECT * FROM myapp_person 
        WHERE last_name = %s
    """, [last_name])
```

Use extra() or RawSQL for embedding raw SQL in ORM queries:

```python
from django.db.models import RawSQL

# Add raw SQL to existing QuerySet
people = Person.objects.extra(
    select={'decade_birth': "birth_date / 10"},
    where=["birth_date > %s"],
    params=['1950-01-01']
)

# Use RawSQL expressions
from django.db.models.expressions import RawSQL
articles = Article.objects.annotate(
    search_rank=RawSQL("ts_rank(search_vector, plainto_tsquery(%s))", [query])
).filter(search_rank__gt=0)
```

Execute custom SQL directly for DDL operations or complex updates:

```python
from django.db import connection, transaction

def create_partitioned_table():
    with connection.cursor() as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS logs_2024 PARTITION OF logs
            FOR VALUES FROM ('2024-01-01') TO ('2025-01-01')
        """)

@transaction.atomic
def bulk_update_status(ids, new_status):
    with connection.cursor() as cursor:
        cursor.executemany("""
            UPDATE myapp_record 
            SET status = %s, updated_at = NOW() 
            WHERE id = %s
        """, [(new_status, record_id) for record_id in ids])
```

Handle results properly with helper functions:

```python
def dictfetchall(cursor):
    """Return all rows from cursor as dict"""
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

def namedtuplefetchall(cursor):
    """Return all rows from cursor as namedtuple"""
    from collections import namedtuple
    desc = cursor.description
    nt_result = namedtuple('Result', [col[0] for col in desc])
    return [nt_result(*row) for row in cursor.fetchall()]

# Usage
with connection.cursor() as cursor:
    cursor.execute("SELECT id, name FROM products WHERE category = %s", [category])
    results = dictfetchall(cursor)
```

Use proper transactions for data modifications:

```python
from django.db import transaction

@transaction.atomic
def complex_data_operation():
    with connection.cursor() as cursor:
        # Multiple related operations
        cursor.execute("UPDATE accounts SET balance = balance - %s WHERE id = %s", [amount, from_id])
        cursor.execute("UPDATE accounts SET balance = balance + %s WHERE id = %s", [amount, to_id])
        cursor.execute("INSERT INTO transfers (from_id, to_id, amount) VALUES (%s, %s, %s)", 
                      [from_id, to_id, amount])
```

## Common Mistakes

- Using string formatting instead of parameterized queries (SQL injection)
- Not using transactions for related operations
- Executing raw SQL in loops (N+1 query problem)
- Not handling database-specific SQL syntax
- Bypassing Django's ORM completely instead of extending it
- Not testing raw SQL queries properly
- Using raw SQL for simple operations that ORM can handle
- Forgetting to handle multiple database backends
- Not using connection pooling properly
- Ignoring database indexes when writing raw queries

## When to Apply

- Complex analytical queries with window functions or CTEs
- Bulk operations that would be inefficient with ORM
- Database-specific features not supported by Django
- Performance-critical queries after profiling ORM alternatives
- Legacy SQL that needs to be preserved
- Database administration tasks (DDL operations)
- Complex reporting queries with aggregations
- Working with stored procedures or database functions