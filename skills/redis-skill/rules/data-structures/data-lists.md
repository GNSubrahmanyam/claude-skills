# Redis Lists (HIGH)

**Impact:** HIGH - Efficient ordered collections and queue operations

**Problem:**
Managing ordered collections and queues with traditional databases leads to performance issues and complex indexing. Redis lists provide atomic operations for ordered data structures.

**Solution:**
Use Redis lists for queues, stacks, recent items, and ordered collections with atomic push/pop operations and blocking capabilities.

❌ **Wrong: Database-based queues**
```python
# Slow database queue
def enqueue_job(job_data):
    # INSERT into jobs table - slow
    db.execute("INSERT INTO job_queue (data, created_at) VALUES (?, ?)",
              (json.dumps(job_data), datetime.now()))

def dequeue_job():
    # SELECT with FOR UPDATE - complex and slow
    db.execute("""
        SELECT id, data FROM job_queue
        WHERE status = 'pending'
        ORDER BY created_at LIMIT 1 FOR UPDATE
    """)
    # UPDATE status - additional query
```

✅ **Correct: Redis list operations**
```python
import redis
from typing import Any, Optional, List
import json
import asyncio

class RedisListManager:
    def __init__(self, redis_client: redis.Redis):
        self.r = redis_client

    # Basic queue operations
    async def enqueue_job(self, queue_name: str, job_data: Any) -> int:
        """Add job to queue (right push)"""
        serialized = json.dumps(job_data) if not isinstance(job_data, str) else job_data
        return self.r.rpush(f"queue:{queue_name}", serialized)

    async def dequeue_job(self, queue_name: str) -> Optional[Any]:
        """Remove and return job from queue (left pop)"""
        job_data = self.r.lpop(f"queue:{queue_name}")
        if job_data:
            try:
                return json.loads(job_data)
            except json.JSONDecodeError:
                return job_data
        return None

    # Blocking queue operations
    async def blocking_dequeue_job(self, queue_name: str, timeout: int = 30) -> Optional[Any]:
        """Blocking dequeue with timeout"""
        job_data = self.r.blpop(f"queue:{queue_name}", timeout=timeout)
        if job_data:
            # BLPOP returns (key, value) tuple
            _, serialized = job_data
            try:
                return json.loads(serialized)
            except json.JSONDecodeError:
                return serialized
        return None

    # Stack operations (LIFO)
    async def push_stack(self, stack_name: str, item: Any) -> int:
        """Push item to stack (right push)"""
        serialized = json.dumps(item) if not isinstance(item, str) else item
        return self.r.rpush(f"stack:{stack_name}", serialized)

    async def pop_stack(self, stack_name: str) -> Optional[Any]:
        """Pop item from stack (right pop)"""
        item = self.r.rpop(f"stack:{stack_name}")
        if item:
            try:
                return json.loads(item)
            except json.JSONDecodeError:
                return item
        return None

    # Recent items (capped lists)
    async def add_recent_item(self, user_id: str, item: Any, max_items: int = 50) -> int:
        """Add item to user's recent items list"""
        key = f"recent:{user_id}"
        serialized = json.dumps(item) if not isinstance(item, str) else item

        with self.r.pipeline() as pipe:
            # Remove the item if it already exists (to move to front)
            pipe.lrem(key, 0, serialized)
            # Add to front (left push)
            pipe.lpush(key, serialized)
            # Trim to max size
            pipe.ltrim(key, 0, max_items - 1)
            results = pipe.execute()

        return results[1]  # Return the push result

    async def get_recent_items(self, user_id: str, limit: int = 10) -> List[Any]:
        """Get user's recent items"""
        key = f"recent:{user_id}"
        items = self.r.lrange(key, 0, limit - 1)

        result = []
        for item in items:
            try:
                result.append(json.loads(item))
            except json.JSONDecodeError:
                result.append(item)

        return result

    # Pagination with lists
    async def get_list_page(self, list_name: str, page: int = 1, page_size: int = 20) -> Dict:
        """Get paginated list data"""
        key = f"list:{list_name}"
        start = (page - 1) * page_size
        end = start + page_size - 1

        with self.r.pipeline() as pipe:
            pipe.llen(key)  # Total count
            pipe.lrange(key, start, end)  # Page items
            total_count, items = pipe.execute()

        # Deserialize items
        deserialized_items = []
        for item in items:
            try:
                deserialized_items.append(json.loads(item))
            except json.JSONDecodeError:
                deserialized_items.append(item)

        total_pages = (total_count + page_size - 1) // page_size

        return {
            "items": deserialized_items,
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }

    # Producer-consumer pattern
    class JobQueue:
        def __init__(self, redis_client: redis.Redis, queue_name: str):
            self.redis = redis_client
            self.queue_name = queue_name
            self.processing_key = f"{queue_name}:processing"

        async def submit_job(self, job_data: Dict) -> str:
            """Submit job to queue"""
            job_id = str(uuid.uuid4())
            job = {
                "id": job_id,
                "data": job_data,
                "submitted_at": datetime.utcnow().isoformat(),
                "status": "queued"
            }

            # Add to queue
            self.redis.rpush(self.queue_name, json.dumps(job))

            # Track in processing set
            self.redis.sadd(self.processing_key, job_id)

            return job_id

        async def process_job(self) -> Optional[Dict]:
            """Process next job from queue"""
            job_data = self.redis.blpop(self.queue_name, timeout=5)
            if not job_data:
                return None

            _, serialized_job = job_data
            job = json.loads(serialized_job)

            # Update status
            job["status"] = "processing"
            job["started_at"] = datetime.utcnow().isoformat()

            # Store processing job
            self.redis.hset(f"job:{job['id']}", "data", json.dumps(job))

            return job

        async def complete_job(self, job_id: str, result: Any = None) -> bool:
            """Mark job as completed"""
            job_key = f"job:{job_id}"

            # Get job data
            job_data = self.redis.hget(job_key, "data")
            if not job_data:
                return False

            job = json.loads(job_data)
            job["status"] = "completed"
            job["completed_at"] = datetime.utcnow().isoformat()
            job["result"] = result

            # Update job data
            self.redis.hset(job_key, "data", json.dumps(job))

            # Remove from processing set
            self.redis.srem(self.processing_key, job_id)

            # Set expiration
            self.redis.expire(job_key, 3600)  # Keep for 1 hour

            return True

    # Social media timeline
    async def add_to_timeline(self, user_id: str, post_data: Dict, max_posts: int = 1000) -> int:
        """Add post to user's timeline"""
        timeline_key = f"timeline:{user_id}"

        with self.r.pipeline() as pipe:
            # Add to beginning of timeline
            pipe.lpush(timeline_key, json.dumps(post_data))
            # Trim to max size
            pipe.ltrim(timeline_key, 0, max_posts - 1)
            results = pipe.execute()

        return results[0]

    async def get_timeline(self, user_id: str, page: int = 1, per_page: int = 20) -> List[Dict]:
        """Get user's timeline with pagination"""
        timeline_key = f"timeline:{user_id}"
        start = (page - 1) * per_page
        end = start + per_page - 1

        posts = self.r.lrange(timeline_key, start, end)

        result = []
        for post in posts:
            try:
                result.append(json.loads(post))
            except json.JSONDecodeError:
                continue

        return result

    # Rate limiting with lists (sliding window)
    async def check_sliding_window_rate_limit(
        self,
        identifier: str,
        limit: int,
        window_seconds: int
    ) -> tuple[bool, int]:
        """Rate limiting using list for sliding window"""
        key = f"ratelimit:{identifier}"
        now = int(time.time())
        window_start = now - window_seconds

        with self.r.pipeline() as pipe:
            # Remove old entries
            pipe.lrem(key, 0, 0)  # Dummy remove to trigger cleanup
            # Add current timestamp
            pipe.lpush(key, now)
            # Remove timestamps outside window
            pipe.ltrim(key, 0, limit - 1)  # Keep only recent entries
            # Count remaining entries
            pipe.llen(key)
            results = pipe.execute()

        current_count = results[-1]

        # Clean up old entries properly
        self.r.zremrangebyscore(f"{key}:timestamps", 0, window_start)

        return current_count <= limit, max(0, limit - current_count)

# Background task queue with Redis lists
class BackgroundTaskQueue:
    def __init__(self, redis_client: redis.Redis, queue_name: str = "tasks"):
        self.redis = redis_client
        self.queue_name = queue_name
        self.processing_queue = f"{queue_name}:processing"

    async def enqueue_task(self, task_type: str, task_data: Dict) -> str:
        """Enqueue background task"""
        task_id = str(uuid.uuid4())
        task = {
            "id": task_id,
            "type": task_type,
            "data": task_data,
            "created_at": datetime.utcnow().isoformat(),
            "status": "queued"
        }

        self.redis.rpush(self.queue_name, json.dumps(task))
        return task_id

    async def dequeue_task(self) -> Optional[Dict]:
        """Dequeue task for processing"""
        task_data = self.redis.blpop(self.queue_name, timeout=1)
        if not task_data:
            return None

        _, serialized_task = task_data
        task = json.loads(serialized_task)

        # Move to processing queue
        self.redis.rpush(self.processing_queue, json.dumps(task))

        return task

    async def complete_task(self, task_id: str, result: Any = None) -> bool:
        """Mark task as completed"""
        # Find and remove from processing queue
        processing_tasks = self.redis.lrange(self.processing_queue, 0, -1)

        for i, task_data in enumerate(processing_tasks):
            try:
                task = json.loads(task_data)
                if task["id"] == task_id:
                    task["status"] = "completed"
                    task["completed_at"] = datetime.utcnow().isoformat()
                    task["result"] = result

                    # Update in processing queue
                    self.redis.lset(self.processing_queue, i, json.dumps(task))
                    return True
            except json.JSONDecodeError:
                continue

        return False
```

**Common mistakes:**
- Using lists for random access patterns
- Not handling empty queue scenarios
- Missing error handling for serialization
- Not using blocking operations appropriately
- Forgetting to trim lists to prevent memory issues

**When to apply:**
- Task queues and job processing
- Recent items and activity feeds
- Producer-consumer patterns
- Rate limiting with sliding windows
- Social media timelines
- Message queues for background processing