# Production Server Setup (MEDIUM)

**Impact:** MEDIUM - Ensures reliable production deployment

**Problem:**
Incorrect server configuration leads to poor performance, crashes, and security issues in production. Using development server in production causes memory leaks and poor concurrency.

**Solution:**
Use production ASGI servers like Uvicorn or Hypercorn with proper worker configuration and process management.

❌ **Wrong: Development server in production**
```bash
# Dangerous - development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

✅ **Correct: Production server configuration**
```python
# uvicorn_config.py
import multiprocessing

# Calculate optimal worker count
workers = multiprocessing.cpu_count() * 2 + 1

# Production configuration
config = {
    "app": "main:app",
    "host": "0.0.0.0",
    "port": 8000,
    "workers": workers,
    "worker_class": "uvicorn.workers.UvicornWorker",
    "worker_connections": 1000,
    "max_requests": 1000,  # Restart worker after requests
    "max_requests_jitter": 50,  # Randomize restart timing
    "log_level": "warning",  # Less verbose logging
    "access_log": True,
    "proxy_headers": True,  # Handle proxy headers
    "server_header": False,  # Don't expose server info
    "date_header": False,
}

# For zero-downtime deployments
zero_downtime_config = config.copy()
zero_downtime_config.update({
    "workers": workers * 2,  # Extra workers for rolling restart
    "max_requests": 500,     # More frequent restarts
})
```

**Common mistakes:**
- Using development server in production
- Wrong worker count calculation
- Not configuring connection limits
- Missing proxy header handling

**When to apply:**
- Production deployments
- Load balancer configuration
- Container orchestration
- Performance optimization