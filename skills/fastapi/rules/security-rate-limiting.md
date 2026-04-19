---
title: Rate Limiting
impact: HIGH
impactDescription: Protects against abuse and ensures fair resource usage
tags: fastapi, security, rate-limiting, abuse-protection
---

## Rate Limiting

**Problem:**
APIs without rate limiting can be overwhelmed by abusive clients, leading to degraded performance, increased costs, and potential service outages.

**Solution:**
Implement rate limiting using Redis or in-memory storage with configurable limits and proper error responses.

❌ **Wrong: No rate limiting**
```python
@app.get("/api/data")
async def get_data():
    # No protection against abuse
    return await expensive_operation()
```

✅ **Correct: Redis-based rate limiting**
```python
from redis.asyncio import Redis
from fastapi import HTTPException
import time

redis = Redis(host='localhost', port=6379, decode_responses=True)

class RateLimiter:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    async def is_allowed(self, key: str, limit: int, window: int) -> bool:
        """
        Check if request is within rate limit
        key: unique identifier (IP, user ID, etc.)
        limit: max requests allowed
        window: time window in seconds
        """
        current_time = int(time.time())
        window_key = f"{key}:{current_time // window}"

        # Count requests in current window
        count = await self.redis.incr(window_key)

        # Set expiry on first request in window
        if count == 1:
            await self.redis.expire(window_key, window)

        return count <= limit

    async def get_remaining(self, key: str, limit: int, window: int) -> int:
        """Get remaining requests in current window"""
        current_time = int(time.time())
        window_key = f"{key}:{current_time // window}"

        count = await self.redis.get(window_key)
        if count is None:
            return limit
        return max(0, limit - int(count))

rate_limiter = RateLimiter(redis)

# Dependency for rate limiting
async def rate_limit_check(
    request: Request,
    limit: int = 100,  # requests per window
    window: int = 60   # seconds
):
    """Rate limiting dependency"""
    # Use client IP as key (could also use user ID for authenticated endpoints)
    client_ip = request.client.host

    if not await rate_limiter.is_allowed(client_ip, limit, window):
        remaining = await rate_limiter.get_remaining(client_ip, limit, window)
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded",
            headers={
                "Retry-After": str(window),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(remaining),
                "X-RateLimit-Reset": str(int(time.time()) + window)
            }
        )

    remaining = await rate_limiter.get_remaining(client_ip, limit, window)
    return {"remaining": remaining, "reset": int(time.time()) + window}

@app.get("/api/data")
async def get_data(
    rate_info: dict = Depends(rate_limit_check)
):
    """Rate-limited endpoint"""
    data = await expensive_operation()
    return {
        "data": data,
        "rate_limit": rate_info
    }

# Different limits for different endpoints
@app.get("/api/search")
async def search_data(
    rate_info: dict = Depends(lambda: rate_limit_check(limit=10, window=60))
):
    """Stricter rate limit for search"""
    return await perform_search()

# User-based rate limiting
async def user_rate_limit(
    current_user: User = Depends(get_current_user),
    limit: int = 1000,  # Higher limit for authenticated users
    window: int = 3600  # Per hour
):
    """Rate limiting based on user ID"""
    user_key = f"user:{current_user.id}"

    if not await rate_limiter.is_allowed(user_key, limit, window):
        remaining = await rate_limiter.get_remaining(user_key, limit, window)
        raise HTTPException(
            status_code=429,
            detail="User rate limit exceeded",
            headers={
                "Retry-After": str(window),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": str(remaining)
            }
        )

    return await rate_limiter.get_remaining(user_key, limit, window)

@app.post("/api/create")
async def create_resource(
    data: dict,
    remaining: int = Depends(user_rate_limit)
):
    """User-based rate limiting for creation endpoints"""
    resource = await create_resource(data)
    return {
        "resource": resource,
        "rate_limit_remaining": remaining
    }

# Global rate limiting middleware
@app.middleware("http")
async def global_rate_limit(request: Request, call_next):
    """Global rate limiting for all endpoints"""
    client_ip = request.client.host
    global_limit = 1000  # requests per minute
    window = 60

    if not await rate_limiter.is_allowed(f"global:{client_ip}", global_limit, window):
        return JSONResponse(
            status_code=429,
            content={"detail": "Global rate limit exceeded"},
            headers={"Retry-After": str(window)}
        )

    response = await call_next(request)
    return response
```

**Common mistakes:**
- Using in-memory rate limiting in distributed deployments
- Not providing proper headers for client handling
- Too restrictive limits causing poor user experience
- Not differentiating between authenticated and anonymous users

**When to apply:**
- Public APIs
- Expensive operations
- Authentication endpoints
- Search functionality
- Any endpoint with high usage potential