# Database Migration Safety (CRITICAL)

**Impact:** CRITICAL - Prevents database corruption and data loss

**Problem:**
Manual modification of migration files can lead to database inconsistencies, deployment failures, and data corruption. Migration files should be treated as immutable once applied.

**Solution:**
Never modify existing migration files manually. Instead, create new migrations for schema changes. Use Django's migration commands to generate and apply migrations safely.

**Examples:**

✅ **Correct: Create new migrations**
```bash
# After changing models.py
python manage.py makemigrations
python manage.py migrate

# For data migrations
python manage.py makemigrations --empty myapp
# Edit the empty migration file to add operations
```

❌ **Wrong: Manual editing of migrations**
```python
# NEVER edit existing migration files!
# This can break deployments and cause inconsistencies

# 0001_initial.py (DON'T MODIFY)
operations = [
    migrations.CreateModel(...),
    # Manually adding new operations here - BAD!
]
```

**Common mistakes:**
- Editing migration files after they've been applied
- Deleting migration files without proper rollback
- Running migrations out of order
- Modifying migrations in production without testing

**When to apply:**
- Making any model changes
- Deploying to new environments
- Working with version control and migrations
- During database schema updates