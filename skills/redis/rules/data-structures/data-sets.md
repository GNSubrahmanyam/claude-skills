# Redis Sets (HIGH)

**Impact:** HIGH - Efficient unique collections and membership testing

**Problem:**
Checking membership in large collections or maintaining unique item lists requires expensive database operations. Redis sets provide O(1) membership testing and unique element guarantees.

**Solution:**
Use Redis sets for unique collections, membership testing, tagging systems, and set operations like unions, intersections, and differences.

❌ **Wrong: Database membership checks**
```python
# Expensive database queries for membership
def user_has_permission(user_id, permission):
    # Slow database query
    result = db.execute("""
        SELECT 1 FROM user_permissions
        WHERE user_id = ? AND permission = ?
        LIMIT 1
    """, (user_id, permission))
    return result.fetchone() is not None

def get_users_with_permission(permission):
    # Another slow query
    users = db.execute("""
        SELECT user_id FROM user_permissions
        WHERE permission = ?
    """, (permission,))
    return [row[0] for row in users]
```

✅ **Correct: Redis set operations**
```python
import redis
from typing import List, Set, Optional

class RedisSetManager:
    def __init__(self, redis_client: redis.Redis):
        self.r = redis_client

    # User permissions system
    async def grant_user_permission(self, user_id: str, permission: str) -> int:
        """Grant permission to user"""
        key = f"user_permissions:{user_id}"
        return self.r.sadd(key, permission)

    async def revoke_user_permission(self, user_id: str, permission: str) -> int:
        """Revoke permission from user"""
        key = f"user_permissions:{user_id}"
        return self.r.srem(key, permission)

    async def user_has_permission(self, user_id: str, permission: str) -> bool:
        """Check if user has permission - O(1)"""
        key = f"user_permissions:{user_id}"
        return bool(self.r.sismember(key, permission))

    async def get_user_permissions(self, user_id: str) -> Set[str]:
        """Get all user permissions"""
        key = f"user_permissions:{user_id}"
        permissions = self.r.smembers(key)
        return {p.decode() if isinstance(p, bytes) else p for p in permissions}

    # Role-based access control
    async def assign_user_role(self, user_id: str, role: str) -> int:
        """Assign role to user"""
        user_roles_key = f"user_roles:{user_id}"
        role_users_key = f"role_users:{role}"

        with self.r.pipeline() as pipe:
            pipe.sadd(user_roles_key, role)
            pipe.sadd(role_users_key, user_id)
            results = pipe.execute()

        return results[0]  # Return from first operation

    async def get_users_in_role(self, role: str) -> Set[str]:
        """Get all users in a role"""
        key = f"role_users:{role}"
        users = self.r.smembers(key)
        return {u.decode() if isinstance(u, bytes) else u for u in users}

    async def get_user_roles(self, user_id: str) -> Set[str]:
        """Get all roles for a user"""
        key = f"user_roles:{user_id}"
        roles = self.r.smembers(key)
        return {r.decode() if isinstance(r, bytes) else r for r in roles}

    async def user_has_role(self, user_id: str, role: str) -> bool:
        """Check if user has role"""
        key = f"user_roles:{user_id}"
        return bool(self.r.sismember(key, role))

    # Tagging system
    async def tag_content(self, content_id: str, tags: List[str]) -> int:
        """Add tags to content"""
        content_tags_key = f"content_tags:{content_id}"

        # Add tags to content
        added = self.r.sadd(content_tags_key, *tags)

        # Update tag index
        with self.r.pipeline() as pipe:
            for tag in tags:
                pipe.sadd(f"tag_contents:{tag}", content_id)
            pipe.execute()

        return added

    async def get_content_tags(self, content_id: str) -> Set[str]:
        """Get tags for content"""
        key = f"content_tags:{content_id}"
        tags = self.r.smembers(key)
        return {t.decode() if isinstance(t, bytes) else t for t in tags}

    async def find_content_by_tags(self, tags: List[str], match_all: bool = False) -> Set[str]:
        """Find content by tags"""
        if not tags:
            return set()

        tag_keys = [f"tag_contents:{tag}" for tag in tags]

        if match_all:
            # Intersection - content must have ALL tags
            result = self.r.sinter(*tag_keys)
        else:
            # Union - content must have ANY tag
            result = self.r.sunion(*tag_keys)

        return {r.decode() if isinstance(r, bytes) else r for r in result}

    # Social features
    async def follow_user(self, follower_id: str, followee_id: str) -> int:
        """Follow a user"""
        follower_key = f"user_following:{follower_id}"
        followee_key = f"user_followers:{followee_id}"

        with self.r.pipeline() as pipe:
            pipe.sadd(follower_key, followee_id)
            pipe.sadd(followee_key, follower_id)
            results = pipe.execute()

        return results[0]

    async def unfollow_user(self, follower_id: str, followee_id: str) -> int:
        """Unfollow a user"""
        follower_key = f"user_following:{follower_id}"
        followee_key = f"user_followers:{followee_id}"

        with self.r.pipeline() as pipe:
            pipe.srem(follower_key, followee_id)
            pipe.srem(followee_key, follower_id)
            results = pipe.execute()

        return results[0]

    async def get_followers(self, user_id: str) -> Set[str]:
        """Get user's followers"""
        key = f"user_followers:{user_id}"
        followers = self.r.smembers(key)
        return {f.decode() if isinstance(f, bytes) else f for f in followers}

    async def get_following(self, user_id: str) -> Set[str]:
        """Get users that user is following"""
        key = f"user_following:{user_id}"
        following = self.r.smembers(key)
        return {f.decode() if isinstance(f, bytes) else f for f in following}

    async def are_friends(self, user1_id: str, user2_id: str) -> bool:
        """Check if two users follow each other"""
        following_key = f"user_following:{user1_id}"
        return bool(self.r.sismember(following_key, user2_id))

    async def get_mutual_followers(self, user1_id: str, user2_id: str) -> Set[str]:
        """Get users who follow both users"""
        followers1 = f"user_followers:{user1_id}"
        followers2 = f"user_followers:{user2_id}"

        mutual = self.r.sinter(followers1, followers2)
        return {m.decode() if isinstance(m, bytes) else m for m in mutual}

    # Analytics and tracking
    async def track_unique_visitors(self, page_id: str, visitor_id: str) -> int:
        """Track unique visitors to a page"""
        key = f"page_visitors:{page_id}"
        return self.r.sadd(key, visitor_id)

    async def get_visitor_count(self, page_id: str) -> int:
        """Get unique visitor count for page"""
        key = f"page_visitors:{page_id}"
        return self.r.scard(key)

    async def track_user_actions(self, user_id: str, actions: List[str]) -> int:
        """Track unique user actions"""
        key = f"user_actions:{user_id}"
        return self.r.sadd(key, *actions)

    async def get_user_action_count(self, user_id: str) -> int:
        """Get count of unique user actions"""
        key = f"user_actions:{user_id}"
        return self.r.scard(key)

    # Recommendation system
    async def add_user_interests(self, user_id: str, interests: List[str]) -> int:
        """Add interests to user"""
        key = f"user_interests:{user_id}"
        return self.r.sadd(key, *interests)

    async def find_similar_users(self, user_id: str, limit: int = 10) -> List[tuple[str, int]]:
        """Find users with similar interests"""
        user_interests_key = f"user_interests:{user_id}"

        # Get user's interests
        user_interests = self.r.smembers(user_interests_key)
        if not user_interests:
            return []

        # Find users with similar interests
        similar_users = {}

        for interest_bytes in user_interests:
            interest = interest_bytes.decode() if isinstance(interest_bytes, bytes) else interest_bytes
            interest_users_key = f"interest_users:{interest}"

            # Get all users interested in this topic
            users = self.r.smembers(interest_users_key)

            for user_bytes in users:
                other_user = user_bytes.decode() if isinstance(user_bytes, bytes) else user_bytes
                if other_user != user_id:
                    similar_users[other_user] = similar_users.get(other_user, 0) + 1

        # Sort by similarity score
        sorted_users = sorted(similar_users.items(), key=lambda x: x[1], reverse=True)
        return sorted_users[:limit]

    # Set operations for advanced queries
    async def get_set_union(self, set_keys: List[str]) -> Set[str]:
        """Get union of multiple sets"""
        if not set_keys:
            return set()

        result = self.r.sunion(*set_keys)
        return {r.decode() if isinstance(r, bytes) else r for r in result}

    async def get_set_intersection(self, set_keys: List[str]) -> Set[str]:
        """Get intersection of multiple sets"""
        if not set_keys:
            return set()

        result = self.r.sinter(*set_keys)
        return {r.decode() if isinstance(r, bytes) else r for r in result}

    async def get_set_difference(self, set_keys: List[str]) -> Set[str]:
        """Get difference of sets (first set minus others)"""
        if not set_keys:
            return set()

        result = self.r.sdiff(*set_keys)
        return {r.decode() if isinstance(r, bytes) else r for r in result}

    # Distributed locks with sets
    async def acquire_distributed_lock(self, lock_name: str, owner_id: str, ttl_seconds: int = 30) -> bool:
        """Acquire distributed lock using set"""
        lock_key = f"lock:{lock_name}"
        owners_key = f"lock_owners:{lock_name}"

        with self.r.pipeline() as pipe:
            pipe.sadd(owners_key, owner_id)
            pipe.expire(owners_key, ttl_seconds)
            results = pipe.execute()

        # Check if we got the lock (first to add gets it)
        return len(self.r.smembers(owners_key)) == 1 and results[0] == 1

    async def release_distributed_lock(self, lock_name: str, owner_id: str) -> bool:
        """Release distributed lock"""
        owners_key = f"lock_owners:{lock_name}"
        return bool(self.r.srem(owners_key, owner_id))

    # Real-time features
    async def join_chat_room(self, room_id: str, user_id: str) -> int:
        """Add user to chat room"""
        room_key = f"chat_room:{room_id}"
        return self.r.sadd(room_key, user_id)

    async def leave_chat_room(self, room_id: str, user_id: str) -> int:
        """Remove user from chat room"""
        room_key = f"chat_room:{room_id}"
        return self.r.srem(room_key, user_id)

    async def get_room_members(self, room_id: str) -> Set[str]:
        """Get all members of chat room"""
        room_key = f"chat_room:{room_id}"
        members = self.r.smembers(room_key)
        return {m.decode() if isinstance(m, bytes) else m for m in members}

    async def get_user_rooms(self, user_id: str) -> Set[str]:
        """Get all rooms user is in (requires reverse index)"""
        # This would need a separate index: user_rooms:{user_id} -> set of room_ids
        user_rooms_key = f"user_rooms:{user_id}"
        rooms = self.r.smembers(user_rooms_key)
        return {r.decode() if isinstance(r, bytes) else r for r in rooms}
```

**Common mistakes:**
- Using sets for ordered data (use lists instead)
- Not handling empty set scenarios
- Missing reverse indexes for bidirectional lookups
- Forgetting to decode bytes from Redis
- Not using pipelines for related set operations

**When to apply:**
- User permissions and roles
- Social features (following, friends)
- Tagging and categorization systems
- Unique visitor tracking
- Real-time chat room membership
- Recommendation algorithms
- Distributed locking mechanisms