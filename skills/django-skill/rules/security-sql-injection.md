# Security SQL Injection (CRITICAL)

**Impact:** CRITICAL - Prevents malicious database manipulation

**Problem:**
SQL injection attacks can compromise entire databases by injecting malicious SQL through user input. Raw SQL queries without proper parameterization are particularly vulnerable.

**Solution:**
Always use Django's ORM methods or parameterized queries. Never construct SQL by string concatenation with user input.

**Examples:**

✅ **Correct: ORM methods**
```python
# Safe - ORM handles parameterization
user = User.objects.get(username=username)
posts = Post.objects.filter(published_date__gte=start_date)

# Safe - parameterized queries
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])
```

❌ **Wrong: String concatenation**
```python
# Vulnerable to SQL injection!
query = f"SELECT * FROM users WHERE username = '{username}'"
User.objects.raw(query)  # DANGER!

# Also vulnerable
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

**Common mistakes:**
- Using string formatting in raw SQL
- Passing user input directly to cursor.execute()
- Using .raw() with unescaped user input
- Building queries with f-strings containing variables

**When to apply:**
- Writing any database queries
- Using raw SQL or custom SQL
- Handling user-provided search/filter parameters
- Reviewing database access code