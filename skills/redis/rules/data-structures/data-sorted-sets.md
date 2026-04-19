# Redis Sorted Sets (HIGH)

**Impact:** HIGH - Ordered unique collections with scoring and ranking

**Problem:**
Maintaining ordered collections with scores, rankings, or priorities requires complex database indexing and slow queries. Redis sorted sets provide efficient ordered operations with O(log n) complexity.

**Solution:**
Use Redis sorted sets for leaderboards, priority queues, time-series data, and ranked collections with atomic score updates and range queries.

❌ **Wrong: Database leaderboard queries**
```python
# Slow database leaderboard
def get_top_players(limit=10):
    # Expensive query with ordering
    players = db.execute("""
        SELECT username, score, rank
        FROM players
        ORDER BY score DESC
        LIMIT ?
    """, (limit,))
    return players.fetchall()

def update_player_score(player_id, new_score):
    # Multiple queries for score update and rank calculation
    db.execute("UPDATE players SET score = ? WHERE id = ?", (new_score, player_id))
    # Recalculate ranks - expensive!
    db.execute("""
        UPDATE players SET rank =
        (SELECT COUNT(*) + 1 FROM players p2 WHERE p2.score > players.score)
    """)
```

✅ **Correct: Redis sorted set operations**
```python
import redis
from typing import List, Dict, Optional, Tuple

class RedisSortedSetManager:
    def __init__(self, redis_client: redis.Redis):
        self.r = redis_client

    # Leaderboard system
    async def update_player_score(self, player_id: str, score: float) -> float:
        """Update player score in leaderboard"""
        key = "leaderboard:players"
        return self.r.zadd(key, {player_id: score})

    async def get_player_score(self, player_id: str) -> Optional[float]:
        """Get player's current score"""
        key = "leaderboard:players"
        score = self.r.zscore(key, player_id)
        return float(score) if score is not None else None

    async def get_top_players(self, limit: int = 10, with_scores: bool = True) -> List[Tuple[str, float]]:
        """Get top players by score"""
        key = "leaderboard:players"
        results = self.r.zrevrange(key, 0, limit - 1, withscores=with_scores)

        # Convert bytes to strings and ensure float scores
        return [
            (member.decode() if isinstance(member, bytes) else member,
             float(score) if isinstance(score, (int, float)) else float(score))
            for member, score in results
        ]

    async def get_player_rank(self, player_id: str) -> Optional[int]:
        """Get player's rank (1-based)"""
        key = "leaderboard:players"
        rank = self.r.zrevrank(key, player_id)
        return rank + 1 if rank is not None else None

    async def get_players_in_score_range(self, min_score: float, max_score: float) -> List[str]:
        """Get players within score range"""
        key = "leaderboard:players"
        players = self.r.zrangebyscore(key, min_score, max_score)
        return [p.decode() if isinstance(p, bytes) else p for p in players]

    # Time-based leaderboards
    async def record_user_activity(self, user_id: str, activity_type: str, timestamp: Optional[float] = None) -> int:
        """Record user activity with timestamp score"""
        if timestamp is None:
            timestamp = time.time()

        key = f"activity:{activity_type}"
        return self.r.zadd(key, {user_id: timestamp})

    async def get_recent_active_users(self, activity_type: str, hours: int = 24) -> List[str]:
        """Get recently active users"""
        key = f"activity:{activity_type}"
        cutoff_time = time.time() - (hours * 3600)

        users = self.r.zrangebyscore(key, cutoff_time, float('inf'))
        return [u.decode() if isinstance(u, bytes) else u for u in users]

    # Priority queues
    async def add_task_to_queue(self, task_id: str, priority: int) -> int:
        """Add task to priority queue (lower priority number = higher priority)"""
        key = "task_queue:priority"
        return self.r.zadd(key, {task_id: priority})

    async def get_next_task(self) -> Optional[str]:
        """Get highest priority task (lowest score)"""
        key = "task_queue:priority"
        tasks = self.r.zpopmin(key)

        if tasks:
            task_id = tasks[0][0]
            return task_id.decode() if isinstance(task_id, bytes) else task_id

        return None

    async def get_pending_tasks_by_priority(self, limit: int = 10) -> List[Tuple[str, int]]:
        """Get pending tasks ordered by priority"""
        key = "task_queue:priority"
        tasks = self.r.zrange(key, 0, limit - 1, withscores=True)

        return [
            (task_id.decode() if isinstance(task_id, bytes) else task_id, int(score))
            for task_id, score in tasks
        ]

    # Analytics and metrics
    async def record_page_view(self, page_id: str, user_id: str, timestamp: Optional[float] = None) -> int:
        """Record page view with timestamp"""
        if timestamp is None:
            timestamp = time.time()

        key = f"page_views:{page_id}"
        return self.r.zadd(key, {user_id: timestamp})

    async def get_page_view_count(self, page_id: str, hours: int = 24) -> int:
        """Get page view count in time window"""
        key = f"page_views:{page_id}"
        cutoff_time = time.time() - (hours * 3600)

        return self.r.zcount(key, cutoff_time, float('inf'))

    async def get_most_viewed_pages(self, hours: int = 24, limit: int = 10) -> List[Tuple[str, int]]:
        """Get most viewed pages in time window"""
        cutoff_time = time.time() - (hours * 3600)

        # Get all page view keys
        page_keys = self.r.keys("page_views:*")

        page_views = {}
        for key_bytes in page_keys:
            key = key_bytes.decode() if isinstance(key_bytes, bytes) else key_bytes
            page_id = key.replace("page_views:", "")
            view_count = self.r.zcount(key, cutoff_time, float('inf'))
            if view_count > 0:
                page_views[page_id] = view_count

        # Sort by view count
        sorted_pages = sorted(page_views.items(), key=lambda x: x[1], reverse=True)
        return sorted_pages[:limit]

    # Rate limiting with sorted sets
    async def check_rate_limit_sliding_window(self, identifier: str, limit: int, window_seconds: int) -> Tuple[bool, int]:
        """Advanced rate limiting with sliding window"""
        key = f"ratelimit:{identifier}"
        now = time.time()
        window_start = now - window_seconds

        with self.r.pipeline() as pipe:
            # Remove old entries
            pipe.zremrangebyscore(key, 0, window_start)
            # Add current request
            pipe.zadd(key, {str(now): now})
            # Count requests in window
            pipe.zcount(key, window_start, now)
            results = pipe.execute()

        request_count = results[2]

        return request_count <= limit, max(0, limit - request_count)

    # Social features and recommendations
    async def add_user_rating(self, user_id: str, item_id: str, rating: float, timestamp: Optional[float] = None) -> int:
        """Add user rating for item"""
        if timestamp is None:
            timestamp = time.time()

        key = f"ratings:{item_id}"
        return self.r.zadd(key, {user_id: rating})

    async def get_item_average_rating(self, item_id: str) -> float:
        """Calculate average rating for item"""
        key = f"ratings:{item_id}"
        ratings = self.r.zrange(key, 0, -1, withscores=True)

        if not ratings:
            return 0.0

        total_rating = sum(float(score) for _, score in ratings)
        return total_rating / len(ratings)

    async def get_top_rated_items(self, min_ratings: int = 5, limit: int = 10) -> List[Tuple[str, float]]:
        """Get top rated items with minimum rating count"""
        # This is complex - would need to maintain separate average score sorted set
        # For simplicity, showing pattern
        avg_ratings_key = "item_avg_ratings"

        items = self.r.zrevrange(avg_ratings_key, 0, limit - 1, withscores=True)
        return [
            (item.decode() if isinstance(item, bytes) else item, float(score))
            for item, score in items
        ]

    # Real-time analytics
    async def record_event(self, event_type: str, user_id: str, metadata: Dict = None, timestamp: Optional[float] = None) -> int:
        """Record user event with metadata"""
        if timestamp is None:
            timestamp = time.time()

        key = f"events:{event_type}"
        event_data = {
            "user_id": user_id,
            "timestamp": timestamp,
            "metadata": metadata or {}
        }

        # Store event data in hash
        event_id = f"{user_id}:{int(timestamp)}"
        self.r.hset(f"event_data:{event_id}", mapping={
            "user_id": user_id,
            "timestamp": str(timestamp),
            "metadata": json.dumps(metadata or {})
        })

        # Add to sorted set for time-based queries
        return self.r.zadd(key, {event_id: timestamp})

    async def get_recent_events(self, event_type: str, hours: int = 24, limit: int = 50) -> List[Dict]:
        """Get recent events of specific type"""
        key = f"events:{event_type}"
        cutoff_time = time.time() - (hours * 3600)

        event_ids = self.r.zrevrangebyscore(key, float('inf'), cutoff_time, start=0, num=limit)

        events = []
        for event_id_bytes in event_ids:
            event_id = event_id_bytes.decode() if isinstance(event_id_bytes, bytes) else event_id_bytes
            event_data = self.r.hgetall(f"event_data:{event_id}")

            if event_data:
                event = {
                    "event_id": event_id,
                    "user_id": event_data.get(b"user_id", b"").decode(),
                    "timestamp": float(event_data.get(b"timestamp", b"0").decode()),
                    "metadata": json.loads(event_data.get(b"metadata", b"{}").decode())
                }
                events.append(event)

        return events

    # Auction system
    async def place_bid(self, auction_id: str, bidder_id: str, bid_amount: float) -> bool:
        """Place bid in auction (higher score wins)"""
        auction_key = f"auction:{auction_id}"
        bidder_key = f"auction_bids:{auction_id}"

        # Check if bid is higher than current highest
        current_highest = self.r.zrevrange(auction_key, 0, 0, withscores=True)
        if current_highest:
            _, highest_bid = current_highest[0]
            if bid_amount <= float(highest_bid):
                return False

        # Add bid to auction
        self.r.zadd(auction_key, {bidder_id: bid_amount})

        # Record bid history
        bid_data = {
            "bidder_id": bidder_id,
            "amount": bid_amount,
            "timestamp": time.time()
        }
        self.r.zadd(bidder_key, {json.dumps(bid_data): time.time()})

        return True

    async def get_auction_status(self, auction_id: str) -> Dict:
        """Get current auction status"""
        auction_key = f"auction:{auction_id}"

        # Get highest bid
        highest_bid = self.r.zrevrange(auction_key, 0, 0, withscores=True)
        if not highest_bid:
            return {"highest_bid": 0, "highest_bidder": None, "total_bids": 0}

        bidder_bytes, bid_score = highest_bid[0]
        bidder = bidder_bytes.decode() if isinstance(bidder_bytes, bytes) else bidder_bytes

        total_bids = self.r.zcard(auction_key)

        return {
            "highest_bid": float(bid_score),
            "highest_bidder": bidder,
            "total_bids": total_bids
        }

    # Geographic leaderboards (simulated)
    async def update_location_score(self, user_id: str, latitude: float, longitude: float, score: float) -> int:
        """Update user score with location data"""
        # Use geohash or similar for location-based scoring
        location_score = hash(f"{latitude:.3f}:{longitude:.3f}") % 1000000

        key = "location_leaderboard"
        return self.r.zadd(key, {user_id: score + location_score / 1000000})

    # Time-decay scoring
    async def add_time_decay_score(self, key: str, member: str, score: float, half_life_hours: float = 24) -> int:
        """Add score with time decay (recent scores worth more)"""
        now = time.time()
        # Apply exponential decay based on time
        time_factor = 2 ** (-now / (half_life_hours * 3600))
        decayed_score = score * time_factor

        return self.r.zadd(key, {member: decayed_score})

    # Periodic score updates
    async def refresh_time_decay_scores(self, key: str, half_life_hours: float = 24) -> int:
        """Refresh all scores in sorted set with time decay"""
        members_scores = self.r.zrange(key, 0, -1, withscores=True)
        now = time.time()

        updates = {}
        for member_bytes, score in members_scores:
            member = member_bytes.decode() if isinstance(member_bytes, bytes) else member_bytes
            # Apply exponential decay
            time_factor = 2 ** (-now / (half_life_hours * 3600))
            new_score = float(score) * time_factor
            updates[member] = new_score

        if updates:
            return self.r.zadd(key, updates)

        return 0
```

**Common mistakes:**
- Using sorted sets for non-scored data (use regular sets)
- Not handling score precision properly
- Missing reverse range queries for top scores
- Forgetting time-based score decay for relevance
- Not using pipelines for atomic operations

**When to apply:**
- Leaderboards and rankings
- Priority queues and job scheduling
- Time-based analytics and metrics
- Auction and bidding systems
- Recommendation scoring
- Rate limiting with time windows
- Social media trending algorithms