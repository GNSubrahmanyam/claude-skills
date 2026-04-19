# Redis Hashes (HIGH)

**Impact:** HIGH - Efficient object storage and partial updates

**Problem:**
Storing complex objects in Redis using strings leads to inefficient storage and update operations. Manual serialization/deserialization increases complexity and error potential.

**Solution:**
Use Redis hashes for object storage with atomic field operations, efficient memory usage, and partial update capabilities.

❌ **Wrong: Storing objects as JSON strings**
```python
# Inefficient object storage
user_data = {"name": "John", "email": "john@example.com", "age": 30}
r.set(f"user:{user_id}", json.dumps(user_data))

# Updating one field requires full read-modify-write
current = json.loads(r.get(f"user:{user_id}"))
current["age"] = 31
r.set(f"user:{user_id}", json.dumps(current))
```

✅ **Correct: Redis hash operations**
```python
import redis
from typing import Dict, Any, Optional

class RedisHashManager:
    def __init__(self, redis_client: redis.Redis):
        self.r = redis_client

    # Object storage with hashes
    async def store_user_object(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Store user object as Redis hash"""
        key = f"user:{user_id}"

        # Convert all values to strings (Redis requirement)
        hash_data = {}
        for field, value in user_data.items():
            if isinstance(value, (dict, list)):
                hash_data[field] = json.dumps(value)
            else:
                hash_data[field] = str(value)

        return bool(self.r.hset(key, mapping=hash_data))

    async def get_user_object(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user object from Redis hash"""
        key = f"user:{user_id}"
        hash_data = self.r.hgetall(key)

        if not hash_data:
            return None

        # Deserialize complex fields
        user_data = {}
        for field, value in hash_data.items():
            field_str = field.decode() if isinstance(field, bytes) else field
            value_str = value.decode() if isinstance(value, bytes) else value

            # Try to parse JSON for complex types
            try:
                user_data[field_str] = json.loads(value_str)
            except (json.JSONDecodeError, TypeError):
                user_data[field_str] = value_str

        return user_data

    # Atomic field operations
    async def update_user_field(self, user_id: str, field: str, value: Any) -> bool:
        """Atomically update a single field"""
        key = f"user:{user_id}"

        # Serialize value
        if isinstance(value, (dict, list)):
            str_value = json.dumps(value)
        else:
            str_value = str(value)

        return bool(self.r.hset(key, field, str_value))

    async def increment_user_field(self, user_id: str, field: str, amount: int = 1) -> int:
        """Atomically increment a numeric field"""
        key = f"user:{user_id}"
        return self.r.hincrby(key, field, amount)

    async def get_user_field(self, user_id: str, field: str) -> Optional[str]:
        """Get a specific field value"""
        key = f"user:{user_id}"
        value = self.r.hget(key, field)
        if value:
            return value.decode() if isinstance(value, bytes) else value
        return None

    # Bulk operations
    async def get_multiple_fields(self, user_id: str, fields: list) -> Dict[str, str]:
        """Get multiple fields at once"""
        key = f"user:{user_id}"
        values = self.r.hmget(key, fields)

        result = {}
        for field, value in zip(fields, values):
            if value is not None:
                result[field] = value.decode() if isinstance(value, bytes) else value

        return result

    # Hash analytics
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get hash statistics and field count"""
        key = f"user:{user_id}"

        with self.r.pipeline() as pipe:
            pipe.hlen(key)  # Number of fields
            pipe.hkeys(key)  # Field names
            pipe.hvals(key)  # Field values
            results = pipe.execute()

        field_count, field_names, field_values = results

        return {
            "field_count": field_count,
            "fields": [name.decode() if isinstance(name, bytes) else name for name in field_names],
            "memory_efficient": field_count > 0  # Hashes are more efficient than JSON strings
        }

    # Conditional updates
    async def update_if_exists(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update fields only if the hash exists"""
        key = f"user:{user_id}"

        # Check if hash exists
        if not self.r.exists(key):
            return False

        # Prepare update data
        hash_updates = {}
        for field, value in updates.items():
            if isinstance(value, (dict, list)):
                hash_updates[field] = json.dumps(value)
            else:
                hash_updates[field] = str(value)

        # Atomic update
        self.r.hset(key, mapping=hash_updates)
        return True

    # Hash expiration
    async def expire_user_hash(self, user_id: str, seconds: int) -> bool:
        """Set expiration on user hash"""
        key = f"user:{user_id}"
        return bool(self.r.expire(key, seconds))

    # Complex object relationships
    async def store_user_with_metadata(self, user_id: str, user_data: Dict, metadata: Dict) -> bool:
        """Store user with separate metadata hash"""
        user_key = f"user:{user_id}"
        meta_key = f"user:{user_id}:metadata"

        with self.r.pipeline() as pipe:
            # Store main user data
            user_hash = {k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
                        for k, v in user_data.items()}
            pipe.hset(user_key, mapping=user_hash)

            # Store metadata separately
            meta_hash = {k: str(v) for k, v in metadata.items()}
            pipe.hset(meta_key, mapping=meta_hash)

            # Set expiration on metadata (shorter TTL)
            pipe.expire(meta_key, 3600)  # 1 hour

            results = pipe.execute()

        return all(results[:-1])  # Don't check expire result

# User profile management
class UserProfileManager:
    def __init__(self, redis_client: redis.Redis):
        self.hash_manager = RedisHashManager(redis_client)

    async def create_user_profile(self, user_id: str, profile_data: Dict) -> bool:
        """Create complete user profile"""
        return await self.hash_manager.store_user_object(user_id, profile_data)

    async def update_user_preferences(self, user_id: str, preferences: Dict) -> bool:
        """Update user preferences atomically"""
        return await self.hash_manager.update_if_exists(user_id, {"preferences": preferences})

    async def increment_login_count(self, user_id: str) -> int:
        """Atomically increment login count"""
        return await self.hash_manager.increment_user_field(user_id, "login_count", 1)

    async def update_last_login(self, user_id: str, timestamp: str) -> bool:
        """Update last login timestamp"""
        return await self.hash_manager.update_user_field(user_id, "last_login", timestamp)

    async def get_user_summary(self, user_id: str) -> Dict[str, Any]:
        """Get user summary with specific fields"""
        fields = ["username", "email", "login_count", "last_login", "status"]
        field_data = await self.hash_manager.get_multiple_fields(user_id, fields)

        # Add computed fields
        summary = dict(field_data)
        summary["user_id"] = user_id
        summary["is_active"] = summary.get("status") == "active"

        return summary

    async def search_users_by_field(self, field: str, value: str) -> List[str]:
        """Find users by field value (requires additional indexing)"""
        # This would require maintaining separate index hashes
        # For simplicity, showing the pattern
        index_key = f"index:{field}:{value}"
        user_ids = self.hash_manager.r.smembers(index_key)

        return [uid.decode() if isinstance(uid, bytes) else uid for uid in user_ids]

# E-commerce product catalog
class ProductCatalogManager:
    def __init__(self, redis_client: redis.Redis):
        self.hash_manager = RedisHashManager(redis_client)

    async def store_product(self, product_id: str, product_data: Dict) -> bool:
        """Store product in hash with inventory tracking"""
        product_key = f"product:{product_id}"

        # Store product data
        success = await self.hash_manager.store_user_object(product_id, product_data)

        if success:
            # Update category index
            category = product_data.get("category")
            if category:
                self.hash_manager.r.sadd(f"category:{category}", product_id)

            # Update inventory index
            in_stock = product_data.get("in_stock", 0)
            if in_stock > 0:
                self.hash_manager.r.sadd("products:in_stock", product_id)

        return success

    async def update_product_inventory(self, product_id: str, new_quantity: int) -> bool:
        """Update product inventory atomically"""
        old_quantity = await self.hash_manager.get_user_field(product_id, "in_stock")
        old_quantity = int(old_quantity) if old_quantity else 0

        # Update quantity
        success = await self.hash_manager.update_user_field(product_id, "in_stock", new_quantity)

        if success:
            # Update inventory index
            if old_quantity > 0 and new_quantity == 0:
                self.hash_manager.r.srem("products:in_stock", product_id)
            elif old_quantity == 0 and new_quantity > 0:
                self.hash_manager.r.sadd("products:in_stock", product_id)

        return success

    async def get_products_in_category(self, category: str, limit: int = 50) -> List[Dict]:
        """Get products in category with hash data"""
        product_ids = self.hash_manager.r.smembers(f"category:{category}")

        products = []
        for product_id_bytes in list(product_ids)[:limit]:
            product_id = product_id_bytes.decode() if isinstance(product_id_bytes, bytes) else product_id_bytes
            product = await self.hash_manager.get_user_object(product_id)
            if product:
                product["id"] = product_id
                products.append(product)

        return products
```

**Common mistakes:**
- Storing large objects in single hash fields
- Not handling field serialization properly
- Missing hash existence checks before updates
- Not using pipelines for related operations
- Forgetting Redis hash field limits

**When to apply:**
- Object storage with frequent field updates
- User profiles and session data
- Product catalogs and inventory
- Configuration management
- Real-time statistics and counters