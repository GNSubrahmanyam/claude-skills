# Redis Strings (HIGH)

**Impact:** HIGH - Enables atomic operations and efficient data storage

**Problem:**
Strings are Redis's fundamental data type but require proper usage patterns for atomic operations, memory efficiency, and performance. Improper string handling leads to race conditions, memory waste, and performance issues.

**Solution:**
Use Redis strings for atomic counters, caching, session storage, and simple key-value operations with proper serialization and encoding.

❌ **Wrong: Basic string usage**
```python
import redis

r = redis.Redis()
# Simple set/get - works but not optimized
r.set('user:123:name', 'John Doe')
r.set('counter', 0)
r.incr('counter')  # Manual increment
```

✅ **Correct: Advanced string operations**
```python
import redis
import json
from typing import Optional, Dict, Any

class RedisStringManager:
    def __init__(self, redis_client: redis.Redis):
        self.r = redis_client

    # Atomic counters with expiration
    async def increment_counter(self, key: str, amount: int = 1, expire_seconds: Optional[int] = None) -> int:
        """Atomically increment counter with optional expiration"""
        pipeline = self.r.pipeline()
        pipeline.incrby(key, amount)
        if expire_seconds:
            pipeline.expire(key, expire_seconds)
        result = pipeline.execute()
        return result[0]

    # User session storage
    async def store_user_session(self, session_id: str, user_data: Dict[str, Any], expire_minutes: int = 30) -> bool:
        """Store user session data with expiration"""
        key = f"session:{session_id}"
        serialized_data = json.dumps(user_data)

        # Use SET with EX for atomic operation
        return bool(self.r.set(key, serialized_data, ex=expire_minutes * 60))

    async def get_user_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user session data"""
        key = f"session:{session_id}"
        data = self.r.get(key)

        if data:
            try:
                return json.loads(data)
            except json.JSONDecodeError:
                # Corrupted data, delete it
                self.r.delete(key)
                return None
        return None

    # Rate limiting with sliding window
    async def check_rate_limit(self, identifier: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        """
        Check rate limit using sorted set for sliding window
        Returns: (allowed, remaining_requests)
        """
        key = f"ratelimit:{identifier}"
        now = int(time.time())
        window_start = now - window_seconds

        # Remove old entries and count current ones
        pipeline = self.r.pipeline()
        pipeline.zremrangebyscore(key, 0, window_start)
        pipeline.zcard(key)
        _, current_count = pipeline.execute()

        if current_count >= limit:
            return False, 0

        # Add current request
        self.r.zadd(key, {str(now): now})
        self.r.expire(key, window_seconds)

        remaining = limit - (current_count + 1)
        return True, max(0, remaining)

    # Cache with automatic expiration
    async def cache_with_ttl(self, key: str, data: Any, ttl_seconds: int) -> bool:
        """Cache data with TTL"""
        try:
            if isinstance(data, (dict, list)):
                serialized = json.dumps(data)
            else:
                serialized = str(data)

            return bool(self.r.set(key, serialized, ex=ttl_seconds))
        except Exception:
            return False

    async def get_cached(self, key: str) -> Optional[Any]:
        """Get cached data with automatic JSON parsing"""
        data = self.r.get(key)
        if not data:
            return None

        try:
            # Try to parse as JSON first
            return json.loads(data)
        except (json.JSONDecodeError, TypeError):
            # Return as string
            return data.decode('utf-8') if isinstance(data, bytes) else data

    # Atomic operations with pipelines
    async def transfer_balance(self, from_account: str, to_account: str, amount: float) -> bool:
        """Atomically transfer balance between accounts"""
        from_key = f"balance:{from_account}"
        to_key = f"balance:{to_account}"

        with self.r.pipeline() as pipe:
            try:
                # Watch for changes
                pipe.watch(from_key)

                # Get current balances
                from_balance = float(pipe.get(from_key) or 0)
                to_balance = float(pipe.get(to_key) or 0)

                if from_balance < amount:
                    pipe.unwatch()
                    return False

                # Execute transfer
                pipe.multi()
                pipe.decrbyfloat(from_key, amount)
                pipe.incrbyfloat(to_key, amount)
                pipe.execute()

                return True

            except redis.WatchError:
                # Transaction failed, retry or handle conflict
                return False

# Distributed locks using Redis
class RedisLock:
    def __init__(self, redis_client: redis.Redis):
        self.r = redis_client

    async def acquire_lock(self, lock_key: str, ttl_seconds: int = 30) -> str:
        """Acquire distributed lock"""
        lock_value = str(uuid.uuid4())

        # Try to acquire lock
        if self.r.set(lock_key, lock_value, ex=ttl_seconds, nx=True):
            return lock_value

        return None

    async def release_lock(self, lock_key: str, lock_value: str) -> bool:
        """Release distributed lock safely"""
        # Use Lua script for atomic check-and-delete
        unlock_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """

        return bool(self.r.eval(unlock_script, 1, lock_key, lock_value))
```

**Common mistakes:**
- Not using pipelines for atomic operations
- Storing large objects as strings
- Not handling serialization/deserialization errors
- Missing expiration on cached data
- Race conditions in counter operations

**When to apply:**
- Atomic counters and statistics
- Session storage and caching
- Rate limiting and throttling
- Distributed locks and coordination
- Simple key-value storage needs