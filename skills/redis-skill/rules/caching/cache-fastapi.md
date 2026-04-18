# FastAPI Redis Caching (HIGH)

**Impact:** HIGH - Enables high-performance response caching and data optimization

**Problem:**
FastAPI applications can become slow without proper caching strategies. Database queries, external API calls, and expensive computations impact response times and scalability.

**Solution:**
Implement comprehensive Redis caching in FastAPI with response caching, dependency caching, and intelligent cache invalidation.

❌ **Wrong: No caching in FastAPI**
```python
@app.get("/users/{user_id}")
async def get_user(user_id: int):
    # Slow database query every time
    user = await get_user_from_db(user_id)
    return user
```

✅ **Correct: FastAPI Redis caching**
```python
from fastapi import FastAPI, Request, Response, Depends
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
import json
import hashlib
from typing import Optional, Dict, Any

app = FastAPI()
redis_client = Redis(host='localhost', port=6379, decode_responses=True)

# Cache configuration
CACHE_TTL = 300  # 5 minutes
CACHE_VERSION = "v1"

class CacheManager:
    def __init__(self, redis_client: Redis):
        self.redis = redis_client

    def generate_cache_key(self, request: Request, user_id: Optional[str] = None) -> str:
        """Generate cache key from request"""
        key_parts = [
            CACHE_VERSION,
            request.method,
            request.url.path,
        ]

        if user_id:
            key_parts.append(f"user:{user_id}")

        # Include query parameters in cache key
        if request.query_params:
            sorted_params = sorted(request.query_params.items())
            key_parts.append(str(sorted_params))

        key_string = ":".join(key_parts)
        return f"cache:{hashlib.md5(key_string.encode()).hexdigest()}"

    async def get_cached_response(self, cache_key: str) -> Optional[Dict]:
        """Get cached response"""
        cached = await self.redis.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except json.JSONDecodeError:
                await self.redis.delete(cache_key)
        return None

    async def set_cached_response(self, cache_key: str, response_data: Dict, ttl: int = CACHE_TTL):
        """Cache response data"""
        try:
            serialized = json.dumps(response_data)
            await self.redis.set(cache_key, serialized, ex=ttl)
        except (TypeError, ValueError):
            # Skip caching if serialization fails
            pass

    async def invalidate_user_cache(self, user_id: str):
        """Invalidate all user-related caches"""
        # Use Redis SCAN for pattern matching
        pattern = f"cache:*user:{user_id}*"
        async for key in self.redis.scan_iter(pattern):
            await self.redis.delete(key)

cache_manager = CacheManager(redis_client)

# Response caching decorator
def cached(ttl: int = CACHE_TTL):
    """Decorator for caching FastAPI responses"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request and response from args
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if not request:
                return await func(*args, **kwargs)

            # Generate cache key
            cache_key = cache_manager.generate_cache_key(request)

            # Try to get from cache
            cached_response = await cache_manager.get_cached_response(cache_key)
            if cached_response:
                return JSONResponse(content=cached_response)

            # Execute function
            result = await func(*args, **kwargs)

            # Cache the result if it's a dict/response
            if isinstance(result, dict):
                await cache_manager.set_cached_response(cache_key, result, ttl)
            elif hasattr(result, 'body'):
                # For FastAPI Response objects, cache the body if possible
                try:
                    body_data = json.loads(result.body.decode())
                    await cache_manager.set_cached_response(cache_key, body_data, ttl)
                except:
                    pass  # Skip caching complex responses

            return result

        return wrapper
    return decorator

# User data with caching
@app.get("/users/{user_id}")
@cached(ttl=600)  # 10 minutes
async def get_user(user_id: int, request: Request):
    """Get user with response caching"""
    user = await get_user_from_db(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat()
    }

# Cache with user-specific invalidation
@app.put("/users/{user_id}")
async def update_user(user_id: int, user_data: dict):
    """Update user and invalidate cache"""
    updated_user = await update_user_in_db(user_id, user_data)

    # Invalidate all caches for this user
    await cache_manager.invalidate_user_cache(str(user_id))

    return updated_user

# API response caching with conditional headers
@app.get("/api/data")
async def get_api_data(
    request: Request,
    response: Response,
    refresh: bool = False
):
    """API data with conditional caching and headers"""
    cache_key = cache_manager.generate_cache_key(request)

    if not refresh:
        # Try to get from cache
        cached_data = await cache_manager.get_cached_response(cache_key)
        if cached_data:
            response.headers["X-Cache"] = "HIT"
            response.headers["X-Cache-TTL"] = str(await redis_client.ttl(cache_key))
            return cached_data

    # Generate fresh data
    data = await generate_expensive_data()

    # Cache the result
    await cache_manager.set_cached_response(cache_key, data)

    # Set cache headers
    response.headers["X-Cache"] = "MISS"
    response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL}"

    return data

# Dependency caching
async def get_expensive_config():
    """Expensive configuration loading with caching"""
    cache_key = f"config:{CACHE_VERSION}"

    config = await redis_client.get(cache_key)
    if config:
        return json.loads(config)

    # Load fresh config
    config = await load_config_from_database()

    # Cache for 1 hour
    await redis_client.set(cache_key, json.dumps(config), ex=3600)

    return config

@app.get("/config")
async def get_config(config: dict = Depends(get_expensive_config)):
    """Configuration endpoint with dependency caching"""
    return config

# Cache warming on startup
@app.on_event("startup")
async def warm_cache():
    """Warm up frequently accessed caches on startup"""
    try:
        # Preload popular data
        popular_users = await get_popular_users()
        for user in popular_users:
            cache_key = f"cache:{CACHE_VERSION}:GET:/users/{user['id']}:[]"
            await cache_manager.set_cached_response(cache_key, user, 1800)

        print("Cache warming completed")

    except Exception as e:
        print(f"Cache warming failed: {e}")

# Cache statistics endpoint
@app.get("/cache/stats")
async def cache_stats():
    """Cache performance statistics"""
    info = await redis_client.info("stats")

    return {
        "cache_hits": info.get("keyspace_hits", 0),
        "cache_misses": info.get("keyspace_misses", 0),
        "hit_ratio": calculate_hit_ratio(info),
        "memory_used": await redis_client.info("memory").get("used_memory_human"),
        "connected_clients": info.get("connected_clients", 0)
    }

def calculate_hit_ratio(info):
    """Calculate cache hit ratio"""
    hits = info.get("keyspace_hits", 0)
    misses = info.get("keyspace_misses", 0)
    total = hits + misses
    return f"{(hits / total * 100):.1f}%" if total > 0 else "0%"

# Background cache invalidation
@app.post("/invalidate-cache")
async def invalidate_cache(pattern: str = "*"):
    """Invalidate cache keys matching pattern"""
    if pattern == "*":
        # Clear all caches - dangerous!
        await redis_client.flushdb()
        return {"message": "All caches cleared"}

    # Safe pattern invalidation
    async for key in redis_client.scan_iter(f"cache:{pattern}"):
        await redis_client.delete(key)

    return {"message": f"Cache keys matching '{pattern}' invalidated"}

# Conditional caching with ETags
@app.get("/resource/{resource_id}")
async def get_resource(
    resource_id: str,
    request: Request,
    response: Response
):
    """Resource with ETag-based conditional caching"""
    resource = await get_resource_by_id(resource_id)

    # Generate ETag
    etag = hashlib.md5(json.dumps(resource, sort_keys=True).encode()).hexdigest()

    # Check If-None-Match header
    if_none_match = request.headers.get("If-None-Match")
    if if_none_match and if_none_match.strip('"') == etag:
        return Response(status_code=304)  # Not Modified

    # Set ETag header
    response.headers["ETag"] = f'"{etag}"'
    response.headers["Cache-Control"] = "public, max-age=300"

    return resource
```

**Common mistakes:**
- Caching sensitive or user-specific data globally
- Not invalidating caches when data changes
- Using wrong TTL values for different data types
- Missing cache headers for client-side caching
- Not handling cache serialization errors

**When to apply:**
- API response caching
- Expensive computation caching
- Database query result caching
- Configuration and metadata caching
- Session and authentication data caching