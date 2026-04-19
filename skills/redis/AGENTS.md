# Redis Data Structures & Caching Best Practices - Complete Rules Reference

This document compiles all 50+ rules from the Redis Data Structures & Caching Best Practices framework, organized by impact priority for comprehensive Redis implementation guidance.

---

## 1. Data Structures (HIGH)

### Strings
**Impact:** HIGH - Enables atomic operations and efficient data storage

**Problem:**
Strings are Redis's fundamental data type but require proper usage patterns for atomic operations, memory efficiency, and performance. Improper string handling leads to race conditions, memory waste, and performance issues.

**Solution:**
Use Redis strings for atomic counters, caching, session storage, and simple key-value operations with proper serialization and encoding.

✅ **Correct: Advanced string operations**
```python
import redis

class RedisStringManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def increment_counter(self, key: str, amount: int = 1, expire_seconds: Optional[int] = None) -> int:
        """Atomically increment counter with optional expiration"""
        pipeline = self.redis.pipeline()
        pipeline.incrby(key, amount)
        if expire_seconds:
            pipeline.expire(key, expire_seconds)
        result = pipeline.execute()
        return result[0]
```

### Hashes
**Impact:** HIGH - Efficient object storage and partial updates

**Problem:**
Storing complex objects in Redis using strings leads to inefficient storage and update operations. Manual serialization/deserialization increases complexity and error potential.

**Solution:**
Use Redis hashes for object storage with atomic field operations, efficient memory usage, and partial update capabilities.

✅ **Correct: Redis hash operations**
```python
class RedisHashManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def store_user_object(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Store user object as Redis hash"""
        key = f"user:{user_id}"
        hash_data = {k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
                    for k, v in user_data.items()}
        return bool(self.redis.hset(key, mapping=hash_data))

    async def update_user_field(self, user_id: str, field: str, value: Any) -> bool:
        """Atomically update a single field"""
        key = f"user:{user_id}"
        str_value = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        return bool(self.redis.hset(key, field, str_value))
```

### Lists
**Impact:** HIGH - Efficient ordered collections and queue operations

**Problem:**
Managing ordered collections and queues with traditional databases leads to performance issues and complex indexing. Redis lists provide atomic operations for ordered data structures.

**Solution:**
Use Redis lists for queues, stacks, recent items, and ordered collections with atomic push/pop operations and blocking capabilities.

✅ **Correct: Redis list operations**
```python
class RedisListManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def enqueue_job(self, queue_name: str, job_data: Any) -> int:
        """Add job to queue (right push)"""
        serialized = json.dumps(job_data) if not isinstance(job_data, str) else job_data
        return self.redis.rpush(f"queue:{queue_name}", serialized)

    async def dequeue_job(self, queue_name: str) -> Optional[Any]:
        """Remove and return job from queue (left pop)"""
        job_data = self.redis.lpop(f"queue:{queue_name}")
        if job_data:
            return json.loads(job_data)
        return None

    async def blocking_dequeue_job(self, queue_name: str, timeout: int = 30) -> Optional[Any]:
        """Blocking dequeue with timeout"""
        job_data = self.redis.blpop(f"queue:{queue_name}", timeout=timeout)
        if job_data:
            _, serialized = job_data
            return json.loads(serialized)
        return None
```

### Sets
**Impact:** HIGH - Efficient unique collections and membership testing

**Problem:**
Checking membership in large collections or maintaining unique item lists requires expensive database operations. Redis sets provide O(1) membership testing and unique element guarantees.

**Solution:**
Use Redis sets for unique collections, membership testing, tagging systems, and set operations like unions, intersections, and differences.

✅ **Correct: Redis set operations**
```python
class RedisSetManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def grant_user_permission(self, user_id: str, permission: str) -> int:
        """Grant permission to user"""
        key = f"user_permissions:{user_id}"
        return self.redis.sadd(key, permission)

    async def user_has_permission(self, user_id: str, permission: str) -> bool:
        """Check if user has permission - O(1)"""
        key = f"user_permissions:{user_id}"
        return bool(self.redis.sismember(key, permission))

    async def find_content_by_tags(self, tags: List[str], match_all: bool = False) -> Set[str]:
        """Find content by tags"""
        tag_keys = [f"tag_contents:{tag}" for tag in tags]
        if match_all:
            result = self.redis.sinter(*tag_keys)  # Intersection
        else:
            result = self.redis.sunion(*tag_keys)  # Union
        return {r.decode() if isinstance(r, bytes) else r for r in result}
```

### Sorted Sets
**Impact:** HIGH - Ordered unique collections with scoring and ranking

**Problem:**
Maintaining ordered collections with scores, rankings, or priorities requires complex database indexing and slow queries. Redis sorted sets provide efficient ordered operations with O(log n) complexity.

**Solution:**
Use Redis sorted sets for leaderboards, priority queues, time-series data, and ranked collections with atomic score updates and range queries.

✅ **Correct: Redis sorted set operations**
```python
class RedisSortedSetManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def update_player_score(self, player_id: str, score: float) -> float:
        """Update player score in leaderboard"""
        key = "leaderboard:players"
        return self.redis.zadd(key, {player_id: score})

    async def get_top_players(self, limit: int = 10) -> List[Tuple[str, float]]:
        """Get top players by score"""
        key = "leaderboard:players"
        results = self.redis.zrevrange(key, 0, limit - 1, withscores=True)
        return [(member.decode() if isinstance(member, bytes) else member,
                float(score)) for member, score in results]

    async def get_player_rank(self, player_id: str) -> Optional[int]:
        """Get player's rank (1-based)"""
        key = "leaderboard:players"
        rank = self.redis.zrevrank(key, player_id)
        return rank + 1 if rank is not None else None
```

---

## 2. Caching Patterns (HIGH)

### Django Redis Caching
**Impact:** HIGH - Dramatically improves Django application performance and scalability

**Problem:**
Django applications suffer from slow database queries, expensive computations, and poor response times without proper caching. Inefficient caching strategies lead to cache stampedes, stale data, and memory waste.

**Solution:**
Implement comprehensive Redis caching in Django with proper cache keys, invalidation strategies, and performance optimization.

✅ **Correct: Django Redis caching**
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'COMPRESSION': 'django_redis.compressors.zlib.ZlibCompressor',
        },
        'KEY_PREFIX': 'myapp',
        'TIMEOUT': 300,
    }
}

# Cache invalidation
CACHE_VERSION = 1

def cache_with_versioning(key_suffix, data_func, timeout=300):
    """Cache with versioning support"""
    cache_key = f"{CACHE_VERSION}:{key_suffix}"
    data = cache.get(cache_key)
    if data is None:
        data = data_func()
        cache.set(cache_key, data, timeout)
    return data
```

### FastAPI Redis Caching
**Impact:** HIGH - Enables high-performance response caching and data optimization

**Problem:**
FastAPI applications can become slow without proper caching strategies. Database queries, external API calls, and expensive computations impact response times and scalability.

**Solution:**
Implement comprehensive Redis caching in FastAPI with response caching, dependency caching, and intelligent cache invalidation.

✅ **Correct: FastAPI Redis caching**
```python
from fastapi import FastAPI, Request, Response
import redis

app = FastAPI()
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

class CacheManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def generate_cache_key(self, request: Request) -> str:
        """Generate cache key from request"""
        key_parts = [request.method, request.url.path]
        if request.query_params:
            key_parts.append(str(sorted(request.query_params.items())))
        key_string = ":".join(key_parts)
        return f"cache:{hash(key_string) % 10000}"

    async def get_cached_response(self, cache_key: str) -> Optional[Dict]:
        """Get cached response"""
        cached = await redis_client.get(cache_key)
        return json.loads(cached) if cached else None

    async def set_cached_response(self, cache_key: str, response_data: Dict, ttl: int = 300):
        """Cache response data"""
        await redis_client.set(cache_key, json.dumps(response_data), ex=ttl)

def cached(ttl: int = 300):
    """Decorator for caching FastAPI responses"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

            if request:
                cache_key = cache_manager.generate_cache_key(request)
                cached_response = await cache_manager.get_cached_response(cache_key)
                if cached_response:
                    return cached_response

            result = await func(*args, **kwargs)
            if request and isinstance(result, dict):
                await cache_manager.set_cached_response(cache_key, result, ttl)

            return result
        return wrapper
    return decorator

cache_manager = CacheManager(redis_client)

@app.get("/api/data")
@cached(ttl=600)
async def get_api_data():
    """API data with response caching"""
    return await fetch_expensive_data()
```

---

## 3. Session Management (MEDIUM-HIGH)

### Django Session Management
**Impact:** MEDIUM-HIGH - Scalable session storage for Django applications

**Problem:**
Django's default database session backend causes performance issues and scalability problems in production. File-based sessions don't work in multi-server deployments.

**Solution:**
Configure Django to use Redis for session storage with proper security, expiration, and performance optimizations.

✅ **Correct: Django Redis sessions**
```python
# settings.py
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'

CACHES = {
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/2',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'django_sessions',
        'TIMEOUT': None,
    }
}

# Session security
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_AGE = 3600
```

---

## 4. Pub/Sub Messaging (MEDIUM-HIGH)

### Pub/Sub Channels
**Impact:** MEDIUM-HIGH - Real-time messaging and event-driven architectures

**Problem:**
Traditional request-response patterns don't support real-time communication or event-driven systems. Building real-time features requires complex polling or WebSocket implementations.

**Solution:**
Use Redis pub/sub for real-time messaging, event broadcasting, and decoupled communication between application components.

✅ **Correct: Redis pub/sub implementation**
```python
import redis
import asyncio
import json
from typing import Callable, Dict, List

class RedisPubSubManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pubsub = self.redis.pubsub()
        self.handlers: Dict[str, List[Callable]] = {}

    async def subscribe(self, channel: str, handler: Callable):
        """Subscribe to channel with handler"""
        if channel not in self.handlers:
            self.handlers[channel] = []
            await self.pubsub.subscribe(channel)

        self.handlers[channel].append(handler)

    async def publish(self, channel: str, message: Any):
        """Publish message to channel"""
        serialized = json.dumps(message) if not isinstance(message, str) else message
        return self.redis.publish(channel, serialized)

    async def listen(self):
        """Listen for messages and dispatch to handlers"""
        while True:
            message = await self.pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                channel = message['channel'].decode()
                data = json.loads(message['data'].decode())

                # Dispatch to handlers
                if channel in self.handlers:
                    for handler in self.handlers[channel]:
                        await handler(channel, data)

            await asyncio.sleep(0.01)

# Usage example
pubsub_manager = RedisPubSubManager(redis_client)

async def handle_user_login(channel: str, data: dict):
    """Handle user login events"""
    user_id = data['user_id']
    print(f"User {user_id} logged in")
    # Update online users, send notifications, etc.

async def handle_order_created(channel: str, data: dict):
    """Handle order creation events"""
    order_id = data['order_id']
    # Process order, send emails, update inventory

# Subscribe to channels
await pubsub_manager.subscribe('user:login', handle_user_login)
await pubsub_manager.subscribe('order:created', handle_order_created)

# Start listening
asyncio.create_task(pubsub_manager.listen())

# Publish messages
await pubsub_manager.publish('user:login', {'user_id': 123})
await pubsub_manager.publish('order:created', {'order_id': 'ABC-123'})
```

### Pattern Matching Subscriptions
**Impact:** MEDIUM-HIGH - Flexible event filtering and routing

**Problem:**
Simple channel-based pub/sub lacks flexibility for complex event routing and filtering. Applications need pattern-based subscriptions for dynamic event handling.

**Solution:**
Use Redis pub/sub pattern matching (PSUBSCRIBE) for flexible event routing and wildcard subscriptions.

✅ **Correct: Pattern matching pub/sub**
```python
class RedisPatternPubSubManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pubsub = self.redis.pubsub()
        self.pattern_handlers: Dict[str, List[Callable]] = {}

    async def psubscribe(self, pattern: str, handler: Callable):
        """Subscribe to pattern with handler"""
        if pattern not in self.pattern_handlers:
            self.pattern_handlers[pattern] = []
            await self.pubsub.psubscribe(pattern)

        self.pattern_handlers[pattern].append(handler)

    async def listen_patterns(self):
        """Listen for pattern-matched messages"""
        while True:
            message = await self.pubsub.get_message(ignore_subscribe_messages=True)
            if message and message['type'] == 'pmessage':
                pattern = message['pattern'].decode()
                channel = message['channel'].decode()
                data = json.loads(message['data'].decode())

                # Dispatch to pattern handlers
                if pattern in self.pattern_handlers:
                    for handler in self.pattern_handlers[pattern]:
                        await handler(pattern, channel, data)

            await asyncio.sleep(0.01)

# Usage example
pattern_pubsub = RedisPatternPubSubManager(redis_client)

async def handle_user_events(pattern: str, channel: str, data: dict):
    """Handle all user-related events"""
    event_type = channel.split(':')[1]  # 'login', 'logout', etc.
    user_id = data['user_id']
    print(f"User {user_id} performed {event_type}")

async def handle_order_events(pattern: str, channel: str, data: dict):
    """Handle all order-related events"""
    event_type = channel.split(':')[1]  # 'created', 'paid', etc.
    order_id = data['order_id']
    print(f"Order {order_id} {event_type}")

# Subscribe to patterns
await pattern_pubsub.psubscribe('user:*', handle_user_events)
await pattern_pubsub.psubscribe('order:*', handle_order_events)

# Start listening
asyncio.create_task(pattern_pubsub.listen_patterns())

# Publish to pattern-matched channels
await pattern_pubsub.redis.publish('user:login', json.dumps({'user_id': 123}))
await pattern_pubsub.redis.publish('order:created', json.dumps({'order_id': 'ABC-123'}))
await pattern_pubsub.redis.publish('user:logout', json.dumps({'user_id': 123}))
```

---

## 5. Performance Optimization (MEDIUM)

### Persistence Configuration
**Impact:** MEDIUM - Data durability and performance balancing

**Problem:**
Redis's in-memory nature requires careful persistence configuration to balance performance with data safety. Wrong persistence settings can lead to data loss or performance degradation.

**Solution:**
Configure RDB and AOF persistence appropriately for your use case, balancing durability with performance.

✅ **Correct: Redis persistence configuration**
```ini
# redis.conf - Production persistence settings

# RDB Snapshotting
save 900 1     # Save after 900 seconds if at least 1 key changed
save 300 10    # Save after 300 seconds if at least 10 keys changed
save 60 10000  # Save after 60 seconds if at least 10000 keys changed

# AOF (Append Only File) - Better durability
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec  # Balance between performance and durability
# appendfsync always   # Maximum durability, slower
# appendfsync no       # Fastest, less durable

# AOF rewrite settings
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Disable dangerous commands in production
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command SHUTDOWN SHUTDOWN_REDIS
```

### Memory Management
**Impact:** MEDIUM - Efficient memory usage and eviction policies

**Problem:**
Redis memory usage can grow unbounded without proper management, leading to out-of-memory errors and system instability.

**Solution:**
Configure memory limits, eviction policies, and monitoring to ensure stable Redis operation.

✅ **Correct: Memory management configuration**
```ini
# redis.conf - Memory management
maxmemory 256mb                    # Set memory limit
maxmemory-policy allkeys-lru      # Evict least recently used keys
# maxmemory-policy volatile-lru    # Only evict keys with TTL
# maxmemory-policy allkeys-random # Random eviction
# maxmemory-policy volatile-random # Random eviction with TTL
# maxmemory-policy noeviction      # Don't evict, return errors

# Memory usage monitoring
maxmemory-samples 5               # Samples for LRU approximation
```

### Connection Pooling
**Impact:** MEDIUM - Efficient connection management and performance

**Problem:**
Creating new Redis connections for each operation is expensive and can exhaust system resources. Poor connection management leads to connection leaks and performance degradation.

**Solution:**
Use connection pooling and configure appropriate pool sizes based on application needs.

✅ **Correct: Connection pooling setup**
```python
import redis
from redis.connection import ConnectionPool

# Connection pool configuration
pool = ConnectionPool(
    host='localhost',
    port=6379,
    db=0,
    max_connections=20,      # Maximum pool size
    decode_responses=True,
    retry_on_timeout=True,
    socket_timeout=5,
    socket_connect_timeout=5,
    health_check_interval=30
)

# Redis client with connection pooling
redis_client = redis.Redis(connection_pool=pool)

# For async applications
import redis.asyncio as redis_async

async_pool = redis.asyncio.ConnectionPool(
    host='localhost',
    port=6379,
    db=0,
    max_connections=20,
    decode_responses=True
)

async_redis = redis.asyncio.Redis(connection_pool=async_pool)
```

---

## 6. Security & Deployment (MEDIUM)

### Authentication & Access Control
**Impact:** MEDIUM - Secure Redis access and command restrictions

**Problem:**
Redis instances are often deployed without authentication, allowing unauthorized access to sensitive data and dangerous commands.

**Solution:**
Configure Redis authentication, restrict commands, and implement proper access controls.

✅ **Correct: Redis security configuration**
```ini
# redis.conf - Security settings
requirepass your_secure_password_here

# Bind to specific interface (not 0.0.0.0 in production)
bind 127.0.0.1

# Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
rename-command SHUTDOWN SHUTDOWN_REDIS
rename-command DEBUG ""
```

### Data Encryption
**Impact:** MEDIUM - Protect sensitive data at rest

**Problem:**
Redis stores data in memory without encryption, making it vulnerable if the system is compromised. Sensitive data requires additional protection.

**Solution:**
Implement application-level encryption for sensitive data stored in Redis.

✅ **Correct: Data encryption patterns**
```python
import redis
from cryptography.fernet import Fernet
import json
import base64

class EncryptedRedisManager:
    def __init__(self, redis_client: redis.Redis, encryption_key: str):
        self.redis = redis_client
        self.cipher = Fernet(encryption_key)

    def encrypt_data(self, data: Any) -> str:
        """Encrypt data before storing"""
        json_data = json.dumps(data)
        encrypted = self.cipher.encrypt(json_data.encode())
        return base64.b64encode(encrypted).decode()

    def decrypt_data(self, encrypted_data: str) -> Any:
        """Decrypt data after retrieval"""
        encrypted = base64.b64decode(encrypted_data)
        decrypted = self.cipher.decrypt(encrypted)
        return json.loads(decrypted.decode())

    async def set_encrypted(self, key: str, data: Any, ttl: Optional[int] = None):
        """Store encrypted data"""
        encrypted_data = self.encrypt_data(data)
        if ttl:
            self.redis.set(key, encrypted_data, ex=ttl)
        else:
            self.redis.set(key, encrypted_data)

    async def get_decrypted(self, key: str) -> Optional[Any]:
        """Retrieve and decrypt data"""
        encrypted_data = self.redis.get(key)
        if encrypted_data:
            return self.decrypt_data(encrypted_data)
        return None

# Usage for sensitive session data
encryption_key = Fernet.generate_key()  # Store securely
encrypted_redis = EncryptedRedisManager(redis_client, encryption_key)

# Store sensitive user data
await encrypted_redis.set_encrypted(
    'user:123:private',
    {'ssn': '123-45-6789', 'credit_card': '4111111111111111'},
    ttl=3600
)

# Retrieve securely
private_data = await encrypted_redis.get_decrypted('user:123:private')
```

### Production Deployment
**Impact:** MEDIUM - Secure and reliable Redis production deployment

**Problem:**
Redis production deployments often lack proper security, monitoring, and high availability configurations, leading to data loss and service disruptions.

**Solution:**
Implement production-ready Redis deployment with security, monitoring, and backup strategies.

✅ **Correct: Production Redis deployment**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis.conf:/etc/redis/redis.conf:ro
      - redis_data:/data
      - ./backups:/backups
    ports:
      - "6379:6379"
    networks:
      - redis_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp

  redis-sentinel:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf:ro
    depends_on:
      - redis
    networks:
      - redis_network

volumes:
  redis_data:
    driver: local

networks:
  redis_network:
    driver: bridge
```

```ini
# redis.conf - Production configuration
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300
daemonize no
supervised systemd

# Security
requirepass your_secure_password
rename-command FLUSHDB ""
rename-command FLUSHALL ""

# Memory management
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# Logging
loglevel notice
logfile /data/redis.log

# Disable dangerous commands
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SHUTDOWN SHUTDOWN_REDIS
```