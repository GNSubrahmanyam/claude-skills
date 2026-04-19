# Result Backend Selection (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Enables task result tracking and retrieval

**Problem:**
Without proper result backend configuration, tasks cannot store or retrieve results, making it impossible to track task completion, handle asynchronous workflows, or implement result-dependent operations.

**Solution:**
Choose appropriate result backends based on requirements for persistence, performance, and scalability. Configure backends properly for production use.

**Examples:**

✅ **Correct: Redis result backend for performance**
```python
# Best for: High-performance, caching, pub/sub features
app.conf.result_backend = 'redis://localhost:6379/1'

# Advanced Redis configuration
app.conf.result_backend_transport_options = {
    'master_name': 'mymaster',  # Redis Sentinel support
    'socket_timeout': 5.0,
    'socket_connect_timeout': 5.0,
    'socket_keepalive': True,
    'socket_keepalive_options': {
        'TCP_KEEPIDLE': 60,
        'TCP_KEEPINTVL': 10,
        'TCP_KEEPCNT': 3,
    },
    'health_check_interval': 30,
    'retry_on_timeout': True,
}

# Result configuration
app.conf.result_expires = 3600  # 1 hour
app.conf.result_cache_max = 10000
app.conf.result_serializer = 'json'
app.conf.result_compression = 'gzip'
```

✅ **Correct: Database result backend for Django**
```python
# Best for: Django integration, ACID compliance, complex queries
app.conf.result_backend = 'django-db'

# Django-specific configuration
app.conf.database_engine_options = {
    'pool_pre_ping': True,  # Verify connections
    'pool_recycle': 3600,  # Recycle connections hourly
}

# Result configuration
app.conf.result_expires = timedelta(days=7)  # Longer retention
app.conf.result_extended = True  # Store additional metadata
```

✅ **Correct: RPC result backend for real-time**
```python
# Best for: Real-time result delivery, low latency, transient results
app.conf.result_backend = 'rpc://'

# RPC-specific configuration
app.conf.result_persistent = False  # Non-persistent messages
app.conf.result_expires = 300  # 5 minutes (short-lived)

# Note: RPC results can only be retrieved once per client
# Not suitable for result caching or multiple consumers
```

✅ **Correct: Choosing the right backend**
```python
def get_result_backend():
    """Select backend based on environment and requirements"""
    env = os.environ.get('CELERY_ENV', 'development')

    if env == 'production':
        # Production: Use database for reliability
        return 'django-db'
    elif env == 'staging':
        # Staging: Use Redis for performance testing
        return 'redis://redis:6379/1'
    else:
        # Development: Use RPC for simplicity
        return 'rpc://'

# Dynamic backend selection
app.conf.result_backend = get_result_backend()

# Environment-specific result expiration
if app.conf.result_backend == 'rpc://':
    app.conf.result_expires = 300  # 5 minutes for RPC
elif app.conf.result_backend == 'django-db':
    app.conf.result_expires = 604800  # 7 days for database
else:
    app.conf.result_expires = 3600  # 1 hour default
```

❌ **Wrong: No result backend configuration**
```python
# Missing result backend - tasks can't store results
app = Celery('myapp')
# No result_backend configured!
# AsyncResult.get() will fail
```

❌ **Wrong: Wrong backend for use case**
```python
# Using RPC backend for persistent results
app.conf.result_backend = 'rpc://'
app.conf.result_expires = 86400  # Won't work - RPC is transient

# Results will disappear when broker restarts
# Can't share results between multiple consumers
```

**Common mistakes:**
- Not configuring result backend for result-dependent workflows
- Using RPC backend when results need to persist
- Setting inappropriate result expiration times
- Missing serialization configuration for complex objects
- Not considering backend performance implications
- Ignoring result backend security (exposed Redis/database)

**When to apply:**
- Tasks that need result retrieval or chaining
- Implementing asynchronous workflows
- Building task progress indicators
- Storing task metadata and statistics
- Implementing task result caching

**Related rules:**
- `result-expiry-management`: Result expiration policies
- `result-storage-optimization`: Optimizing result storage
- `result-cleanup-strategy`: Result cleanup procedures
- `config-result-backend`: Basic result backend setup</content>
<parameter name="filePath">skills/celery-skill/rules/result-backend-selection.md