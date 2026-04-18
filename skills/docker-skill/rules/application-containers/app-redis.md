# Redis Containerization (CRITICAL)
**Impact:** CRITICAL - Ensures reliable Redis deployment as a caching and data structure store in containerized environments

**Problem:**
Redis requires specific containerization considerations for persistence, memory management, security, and high availability. Incorrect configuration leads to data loss, performance issues, and security vulnerabilities in production environments.

**Solution:**
Implement production-ready Redis containers with proper persistence, clustering, security, monitoring, and performance optimization following Redis best practices.

## ✅ Correct: Production Redis containerization

### 1. Basic Redis cache service
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: myapp_cache
    restart: unless-stopped

    # Security
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --tcp-keepalive 300
      --timeout 0
      --appendonly yes
      --appendfsync everysec
      --save 900 1
      --save 300 10
      --loglevel notice

    # Persistence
    volumes:
      - redis_data:/data
      - redis_logs:/var/log/redis

    # Networking
    networks:
      - cache_network
    ports:
      - "${REDIS_PORT:-6379}:6379"

    # Resources
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

    # Health checks
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

    # Security
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp

volumes:
  redis_data:
  redis_logs:

networks:
  cache_network:
    driver: bridge
    internal: true
```

### 2. Redis with custom configuration file
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: myapp_redis
    restart: unless-stopped

    # Use custom config file
    volumes:
      - ./redis.conf:/etc/redis/redis.conf:ro
      - redis_data:/data
      - redis_logs:/var/log/redis
    command: redis-server /etc/redis/redis.conf

    networks:
      - cache_network
    ports:
      - "${REDIS_PORT:-6379}:6379"

    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

volumes:
  redis_data:
  redis_logs:

networks:
  cache_network:
    driver: bridge
    internal: true
```

### 3. Redis Sentinel for High Availability
```yaml
version: '3.8'

services:
  # Redis master
  redis-master:
    image: redis:7-alpine
    container_name: redis_master
    restart: unless-stopped
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-master.conf:/etc/redis/redis.conf:ro
      - redis_master_data:/data
    networks:
      redis_net:
        ipv4_address: 172.20.0.10
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Redis replica
  redis-replica:
    image: redis:7-alpine
    container_name: redis_replica
    restart: unless-stopped
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-replica.conf:/etc/redis/redis.conf:ro
      - redis_replica_data:/data
    depends_on:
      - redis-master
    networks:
      redis_net:
        ipv4_address: 172.20.0.11
    healthcheck:
      test: ["CMD", "redis-cli", "-h", "redis-master", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Redis Sentinel
  redis-sentinel:
    image: redis:7-alpine
    container_name: redis_sentinel
    restart: unless-stopped
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf:ro
    depends_on:
      - redis-master
      - redis-replica
    networks:
      redis_net:
        ipv4_address: 172.20.0.12
    ports:
      - "26379:26379"

volumes:
  redis_master_data:
  redis_replica_data:

networks:
  redis_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 4. Redis Cluster for scaling
```yaml
version: '3.8'

services:
  redis-1:
    image: redis:7-alpine
    container_name: redis_1
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-cluster.conf:/etc/redis/redis.conf:ro
      - redis_1_data:/data
    networks:
      redis_cluster:
        ipv4_address: 172.20.0.10
    ports:
      - "7001:6379"

  redis-2:
    image: redis:7-alpine
    container_name: redis_2
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-cluster.conf:/etc/redis/redis.conf:ro
      - redis_2_data:/data
    networks:
      redis_cluster:
        ipv4_address: 172.20.0.11
    ports:
      - "7002:6379"

  redis-3:
    image: redis:7-alpine
    container_name: redis_3
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-cluster.conf:/etc/redis/redis.conf:ro
      - redis_3_data:/data
    networks:
      redis_cluster:
        ipv4_address: 172.20.0.12
    ports:
      - "7003:6379"

volumes:
  redis_1_data:
  redis_2_data:
  redis_3_data:

networks:
  redis_cluster:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## ❌ Incorrect: Redis antipatterns

```yaml
# ❌ Basic Redis without persistence
services:
  redis:
    image: redis:alpine
# Data lost on container restart

# ❌ No password protection
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
# Insecure - anyone can access

# ❌ No memory limits
services:
  redis:
    image: redis:alpine
# Can consume unlimited memory

# ❌ Default configuration in production
services:
  redis:
    image: redis:alpine
# Not optimized for production
```

## Redis Configuration Files

### redis.conf (Production)
```ini
# Network
bind 0.0.0.0
port 6379
tcp-keepalive 300
timeout 0
protected-mode yes

# Security
requirepass your_secure_password_here
rename-command FLUSHDB ""
rename-command FLUSHALL ""

# Memory
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
logfile /var/log/redis/redis.log
```

### sentinel.conf
```ini
sentinel monitor mymaster redis-master 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
sentinel auth-pass mymaster your_password_here
```

### redis-cluster.conf
```ini
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
cluster-migration-barrier 1
appendonly yes
```

## Redis Use Cases and Patterns

### 1. Session Store
```python
# Django settings for Redis sessions
SESSION_ENGINE = 'redis_sessions.session'
SESSION_REDIS = {
    'host': 'redis',
    'port': 6379,
    'db': 1,
    'password': os.getenv('REDIS_PASSWORD'),
    'prefix': 'session',
    'socket_timeout': 1,
    'retry_on_timeout': False,
}
```

### 2. Cache Backend
```python
# Django cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'redis://:{REDIS_PASSWORD}@redis:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

### 3. Celery Broker and Result Backend
```python
# Celery configuration
CELERY_BROKER_URL = f'redis://:{REDIS_PASSWORD}@redis:6379/1'
CELERY_RESULT_BACKEND = f'redis://:{REDIS_PASSWORD}@redis:6379/2'
CELERY_TASK_SERIALIZER = 'json'
```

### 4. Rate Limiting
```python
# Redis-based rate limiting
import redis
import time

class RateLimiter:
    def __init__(self, redis_client, key_prefix="rate_limit"):
        self.redis = redis_client
        self.key_prefix = key_prefix

    def is_allowed(self, identifier, limit=100, window=60):
        key = f"{self.key_prefix}:{identifier}"
        current = self.redis.get(key)

        if current is None:
            self.redis.setex(key, window, 1)
            return True

        if int(current) < limit:
            self.redis.incr(key)
            return True

        return False
```

## Redis Monitoring and Maintenance

### 1. Redis Exporter for Prometheus
```yaml
services:
  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      - REDIS_ADDR=redis://redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    ports:
      - "9121:9121"
    depends_on:
      - redis
```

### 2. Redis Commander (Web UI)
```yaml
services:
  redis-commander:
    image: rediscommander/redis-commander:latest
    environment:
      - REDIS_HOSTS=local:redis:6379:${REDIS_PASSWORD}
    ports:
      - "8081:8081"
    depends_on:
      - redis
```

### 3. Backup Strategy
```bash
#!/bin/bash
# Redis backup script
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Trigger save
docker exec myapp_redis redis-cli -a $REDIS_PASSWORD SAVE

# Copy RDB file
docker cp myapp_redis:/data/dump.rdb $BACKUP_DIR/redis_$TIMESTAMP.rdb

# Compress
gzip $BACKUP_DIR/redis_$TIMESTAMP.rdb

# Cleanup old backups
find $BACKUP_DIR -name "redis_*.rdb.gz" -mtime +7 -delete
```

### 4. Redis Modules (Advanced Features)
```yaml
# Redis Stack with modules (RedisJSON, RedisSearch, RedisTimeSeries, RedisBloom, RedisGraph)
version: '3.8'

services:
  redis-stack:
    image: redis/redis-stack:latest
    container_name: redis_stack
    restart: unless-stopped
    ports:
      - "6379:6379"
      - "8001:8001"  # RedisInsight web UI
    volumes:
      - redis_stack_data:/data
    environment:
      - REDIS_ARGS="--requirepass ${REDIS_PASSWORD}"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  redis_stack_data:
```

```yaml
# Redis with specific modules
services:
  redis-json:
    image: redis/redis-stack-server:latest
    command: >
      redis-server
      --loadmodule /opt/redis-stack/lib/redisearch.so
      --loadmodule /opt/redis-stack/lib/redisjson.so
      --loadmodule /opt/redis-stack/lib/redistimeseries.so
    volumes:
      - redis_data:/data
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
```

## Advanced Redis Features

### 1. Redis Streams (Event Sourcing)
```python
import redis

# Redis Streams for event sourcing
class EventStore:
    def __init__(self, redis_client):
        self.redis = redis_client

    def publish_event(self, stream_name, event_type, data):
        event_id = self.redis.xadd(stream_name, {
            'event_type': event_type,
            'data': json.dumps(data),
            'timestamp': datetime.utcnow().isoformat()
        })
        return event_id

    def read_events(self, stream_name, last_id='0'):
        return self.redis.xread({stream_name: last_id})

    def create_consumer_group(self, stream_name, group_name):
        try:
            self.redis.xgroup_create(stream_name, group_name, id='0')
        except redis.ResponseError:
            pass  # Group already exists

    def consume_events(self, stream_name, group_name, consumer_name):
        return self.redis.xreadgroup(
            group_name, consumer_name,
            {stream_name: '>'}, count=10
        )

# Usage
event_store = EventStore(redis_client)
event_store.publish_event('user_events', 'user_created', {'user_id': 123, 'email': 'user@example.com'})
```

### 2. Redis Lua Scripting
```lua
-- Lua script for atomic operations
local key = KEYS[1]
local value = ARGV[1]
local ttl = ARGV[2]

-- Check if key exists
if redis.call('EXISTS', key) == 1 then
    return redis.call('GET', key)
else
    redis.call('SETEX', key, ttl, value)
    return value
end
```

```python
# Using Lua scripts in Python
lua_script = """
    local key = KEYS[1]
    local value = ARGV[1]
    local ttl = ARGV[2]

    if redis.call('EXISTS', key) == 1 then
        return redis.call('GET', key)
    else
        redis.call('SETEX', key, ttl, value)
        return value
    end
"""

script = redis_client.register_script(lua_script)
result = script(keys=['cache_key'], args=['cache_value', 3600])
```

### 3. Redis Geospatial Features
```python
# Redis geospatial operations
class LocationService:
    def __init__(self, redis_client):
        self.redis = redis_client

    def add_location(self, user_id, longitude, latitude):
        self.redis.geoadd('locations', longitude, latitude, user_id)

    def find_nearby(self, longitude, latitude, radius_km=5):
        return self.redis.georadius(
            'locations', longitude, latitude, radius_km, 'km',
            withcoord=True, withdist=True, sort='ASC'
        )

    def calculate_distance(self, user1_id, user2_id):
        return self.redis.geodist('locations', user1_id, user2_id, 'km')

# Usage
location_service = LocationService(redis_client)
location_service.add_location('user123', -122.4194, 37.7749)  # San Francisco
nearby_users = location_service.find_nearby(-122.4194, 37.7749, 10)
```

### 4. Redis Pub/Sub with Patterns
```python
import redis
import threading
import time

class PubSubManager:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.pubsub = self.redis.pubsub()

    def publish_message(self, channel, message):
        self.redis.publish(channel, json.dumps(message))

    def subscribe_to_channel(self, channel, callback):
        self.pubsub.subscribe(channel)
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                callback(json.loads(message['data']))

    def subscribe_to_pattern(self, pattern, callback):
        self.pubsub.psubscribe(pattern)
        for message in self.pubsub.listen():
            if message['type'] == 'pmessage':
                callback(message['channel'], json.loads(message['data']))

# Usage
pubsub = PubSubManager(redis_client)

# Subscribe to specific channel
def order_callback(message):
    print(f"New order: {message}")

threading.Thread(
    target=pubsub.subscribe_to_channel,
    args=('orders', order_callback)
).start()

# Subscribe to pattern
def notification_callback(channel, message):
    print(f"Notification on {channel}: {message}")

threading.Thread(
    target=pubsub.subscribe_to_pattern,
    args=('notifications:*', notification_callback)
).start()

# Publish messages
pubsub.publish_message('orders', {'order_id': 123, 'amount': 99.99})
pubsub.publish_message('notifications:email', {'user_id': 456, 'type': 'welcome'})
```

### 5. Redis Pipelines and Transactions
```python
# Redis pipelines for batch operations
def batch_set_keys(redis_client, key_value_pairs):
    with redis_client.pipeline() as pipe:
        for key, value in key_value_pairs.items():
            pipe.setex(key, 3600, value)
        pipe.execute()

# Usage
batch_set_keys(redis_client, {
    'user:123:name': 'John Doe',
    'user:123:email': 'john@example.com',
    'user:456:name': 'Jane Smith'
})

# Redis transactions
def transfer_balance(redis_client, from_user, to_user, amount):
    with redis_client.pipeline() as pipe:
        while True:
            try:
                # Watch the source balance
                pipe.watch(f'balance:{from_user}')

                # Get current balances
                from_balance = int(redis_client.get(f'balance:{from_user}') or 0)
                to_balance = int(redis_client.get(f'balance:{to_user}') or 0)

                if from_balance < amount:
                    pipe.unwatch()
                    return False

                # Start transaction
                pipe.multi()
                pipe.decrby(f'balance:{from_user}', amount)
                pipe.incrby(f'balance:{to_user}', amount)
                pipe.execute()

                return True

            except redis.WatchError:
                continue  # Retry on conflict

# Usage
success = transfer_balance(redis_client, 'user123', 'user456', 100)
```

### 6. Redis ACL (Access Control Lists)
```ini
# Redis ACL configuration
# Advanced security with fine-grained permissions

# User definitions in redis.conf or via ACL commands
user default on >defaultpassword ~* &* +@all
user readonly on >readonlypass ~user:* +@read
user app on >apppassword ~app:* +@all -@dangerous
user analytics on >analyticspass ~analytics:* +@read +@write +@sortedset +@hash
user admin on >adminpass ~* &* +@all

# ACL categories:
# @keyspace - Key commands (DEL, EXISTS, etc.)
# @read - Read commands (GET, HGET, etc.)
# @write - Write commands (SET, HSET, etc.)
# @set - Set commands
# @sortedset - Sorted set commands
# @hash - Hash commands
# @list - List commands
# @hyperloglog - HyperLogLog commands
# @geo - Geospatial commands
# @stream - Stream commands
# @pubsub - Pub/Sub commands
# @bitmap - Bitmap commands
# @cluster - Cluster commands
# @scripting - Scripting commands
# @server - Server management commands
# @connection - Connection commands
# @transaction - Transaction commands
```

### 7. Redis Time Series with RedisTimeSeries Module
```python
import redis

# Using RedisTimeSeries module
class TimeSeriesDB:
    def __init__(self, redis_client):
        self.redis = redis_client

    def create_timeseries(self, key, retention_ms=86400000):  # 24 hours
        self.redis.execute_command('TS.CREATE', key, 'RETENTION', retention_ms)

    def add_datapoint(self, key, timestamp, value):
        self.redis.execute_command('TS.ADD', key, timestamp, value)

    def get_range(self, key, from_time, to_time):
        return self.redis.execute_command('TS.RANGE', key, from_time, to_time)

    def get_stats(self, key):
        return self.redis.execute_command('TS.INFO', key)

# Usage
ts_db = TimeSeriesDB(redis_client)
ts_db.create_timeseries('temperature:sensor1', retention_ms=604800000)  # 7 days

# Add temperature readings
import time
ts_db.add_datapoint('temperature:sensor1', int(time.time() * 1000), 23.5)
ts_db.add_datapoint('temperature:sensor1', int(time.time() * 1000), 24.1)

# Query last 24 hours
last_24h = ts_db.get_range('temperature:sensor1',
                          int((time.time() - 86400) * 1000),
                          int(time.time() * 1000))
```

### 8. Redis JSON with RedisJSON Module
```python
import redis

# Using RedisJSON module
class JSONStore:
    def __init__(self, redis_client):
        self.redis = redis_client

    def set_user(self, user_id, user_data):
        self.redis.execute_command('JSON.SET', f'user:{user_id}', '.', json.dumps(user_data))

    def get_user(self, user_id):
        result = self.redis.execute_command('JSON.GET', f'user:{user_id}')
        return json.loads(result) if result else None

    def update_user_field(self, user_id, field, value):
        self.redis.execute_command('JSON.SET', f'user:{user_id}', f'.{field}', json.dumps(value))

    def search_users(self, city):
        # Using JSONPath queries
        return self.redis.execute_command('JSON.GET', 'user:*', f'$[?(@.city == "{city}")]')

# Usage
json_store = JSONStore(redis_client)
json_store.set_user(123, {
    'name': 'John Doe',
    'email': 'john@example.com',
    'city': 'New York',
    'orders': []
})

user = json_store.get_user(123)
json_store.update_user_field(123, 'city', 'San Francisco')
```

### 9. Redis Connection Pooling
```python
from redis import ConnectionPool, Redis
import os

# Connection pool for better performance
pool = ConnectionPool(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD'),
    db=int(os.getenv('REDIS_DB', 0)),
    max_connections=20,  # Maximum connections in pool
    decode_responses=True,
    retry_on_timeout=True,
    socket_timeout=5,
    socket_connect_timeout=5,
    health_check_interval=30
)

# Create Redis client with connection pool
redis_client = Redis(connection_pool=pool)

# Usage - connections are automatically managed
redis_client.set('key', 'value')
value = redis_client.get('key')
redis_client.expire('key', 3600)
```

### 10. Redis in Kubernetes with Redis Operator
```yaml
# Redis operator deployment (using RedisLabs Redis Enterprise)
apiVersion: app.redislabs.com/v1
kind: RedisEnterpriseCluster
metadata:
  name: redis-cluster
spec:
  nodes: 3
  redisEnterpriseImageSpec:
    imagePullPolicy: IfNotPresent
    repository: redislabs/redis
    versionTag: 6.2.18-82
  persistentSpec:
    enabled: true
    storageClassName: standard
    volumeSize: 20Gi

---
apiVersion: app.redislabs.com/v1
kind: RedisEnterpriseDatabase
metadata:
  name: redis-db
spec:
  memorySize: 1GB
  replication: true
  shardsCount: 3
  tlsMode: enabled
```

### 11. Redis Enterprise Features
```yaml
# Redis Enterprise with advanced features
services:
  redis-enterprise:
    image: redislabs/redis:latest
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - redis_enterprise_data:/opt/redislabs/data
    ports:
      - "12000:12000"  # Management UI
      - "12001:12001"  # Database port
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'

volumes:
  redis_enterprise_data:
```

### 12. Redis Performance Monitoring
```bash
# Redis performance monitoring commands
docker exec myapp_redis redis-cli -a $REDIS_PASSWORD info

# Key metrics to monitor:
# - used_memory
# - connected_clients
# - total_commands_processed
# - instantaneous_ops_per_sec
# - keyspace_hits/keyspace_misses
# - evicted_keys
# - expired_keys

# Slow log analysis
docker exec myapp_redis redis-cli -a $REDIS_PASSWORD slowlog get 10

# Memory analysis
docker exec myapp_redis redis-cli -a $REDIS_PASSWORD memory stats
docker exec myapp_redis redis-cli -a $REDIS_PASSWORD memory doctor
```

## Key Benefits
- **High performance**: In-memory data structure store
- **Persistence options**: RDB snapshots and AOF logging
- **Data structures**: Rich set of data types beyond key-value
- **Pub/Sub**: Real-time messaging capabilities
- **Lua scripting**: Server-side scripting for complex operations
- **Clustering**: Horizontal scaling and high availability
- **Extensibility**: Modules for additional functionality

## Redis Configuration Examples

### Advanced Redis Configuration
```ini
# High-performance Redis configuration
# Network optimization
bind 0.0.0.0
port 6379
tcp-keepalive 300
timeout 0
tcp-backlog 511
databases 16

# Memory optimization
maxmemory 1gb
maxmemory-policy allkeys-lru
maxmemory-samples 5
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del no

# Persistence optimization
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
appendfilename "appendonly.aof"
appenddirname "appendonlydir"
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Performance tuning
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
list-compress-depth 0
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# Threading (Redis 6+)
io-threads 4
io-threads-do-reads yes

# Security
protected-mode yes
requirepass your_secure_password_here
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command SHUTDOWN SHUTDOWN_REDIS
rename-command CONFIG CONFIG_REDIS

# Monitoring
slowlog-log-slower-than 10000
slowlog-max-len 128
latency-monitor-threshold 0

# Advanced features
stream-node-max-bytes 4096
stream-node-max-entries 100
activerehashing yes
hz 10
```

### Redis with TLS/SSL
```yaml
version: '3.8'

services:
  redis-tls:
    image: redis:7-alpine
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-tls.conf:/etc/redis/redis.conf:ro
      - ./certs:/etc/ssl/certs:ro
      - redis_tls_data:/data
    ports:
      - "6380:6380"  # TLS port
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}

volumes:
  redis_tls_data:
```

```ini
# redis-tls.conf
port 0
tls-port 6380
tls-cert-file /etc/ssl/certs/redis.crt
tls-key-file /etc/ssl/private/redis.key
tls-ca-cert-file /etc/ssl/certs/ca.crt
tls-auth-clients optional
tls-protocols "TLSv1.2 TLSv1.3"
requirepass your_password_here
```

### Redis with Active-Active Replication (CRDB)
```yaml
version: '3.8'

services:
  redis-crdb-1:
    image: redis/redis-stack-server:latest
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-crdb.conf:/etc/redis/redis.conf:ro
      - redis_crdb1_data:/data
    networks:
      crdb_net:
        ipv4_address: 172.20.1.10
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}

  redis-crdb-2:
    image: redis/redis-stack-server:latest
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-crdb.conf:/etc/redis/redis.conf:ro
      - redis_crdb2_data:/data
    networks:
      crdb_net:
        ipv4_address: 172.20.1.11
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}

networks:
  crdb_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.1.0/24

volumes:
  redis_crdb1_data:
  redis_crdb2_data:
```

### Redis as Message Queue with Streams
```python
# Advanced message queue with Redis Streams
class MessageQueue:
    def __init__(self, redis_client):
        self.redis = redis_client

    def send_message(self, queue_name, message, max_len=1000):
        """Send message to queue with automatic trimming"""
        message_id = self.redis.xadd(queue_name, {
            'data': json.dumps(message),
            'timestamp': datetime.utcnow().isoformat(),
            'type': 'message'
        }, maxlen=max_len)
        return message_id

    def create_consumer_group(self, queue_name, group_name):
        """Create consumer group for load balancing"""
        try:
            self.redis.xgroup_create(queue_name, group_name, id='0', mkstream=True)
        except redis.ResponseError as e:
            if 'BUSYGROUP' not in str(e):
                raise

    def consume_messages(self, queue_name, group_name, consumer_name, count=10):
        """Consume messages from queue"""
        messages = self.redis.xreadgroup(
            group_name, consumer_name,
            {queue_name: '>'}, count=count, block=5000
        )

        processed_messages = []
        for stream, message_list in messages:
            for message_id, message_data in message_list:
                try:
                    # Process message
                    data = json.loads(message_data['data'])
                    # ... process data ...

                    # Acknowledge message
                    self.redis.xack(queue_name, group_name, message_id)
                    processed_messages.append((message_id, data))

                except Exception as e:
                    # Handle processing error
                    # Could implement dead letter queue here
                    print(f"Failed to process message {message_id}: {e}")

        return processed_messages

    def get_pending_messages(self, queue_name, group_name, consumer_name=None):
        """Check for pending messages"""
        return self.redis.xpending(queue_name, group_name)

    def monitor_queue_health(self, queue_name):
        """Monitor queue health metrics"""
        info = self.redis.xinfo_stream(queue_name)
        groups = self.redis.xinfo_groups(queue_name)

        return {
            'length': info['length'],
            'radix_tree_keys': info['radix-tree-keys'],
            'radix_tree_nodes': info['radix-tree-nodes'],
            'groups': len(groups),
            'first_entry': info.get('first-entry'),
            'last_entry': info.get('last-entry')
        }

# Usage
queue = MessageQueue(redis_client)

# Create consumer group
queue.create_consumer_group('orders', 'order_processors')

# Send message
message_id = queue.send_message('orders', {
    'order_id': '12345',
    'customer_id': '67890',
    'items': ['item1', 'item2'],
    'total': 99.99
})

# Consume messages
messages = queue.consume_messages('orders', 'order_processors', 'worker-1')

# Monitor health
health = queue.monitor_queue_health('orders')
```

## Redis Best Practices and Anti-Patterns

### ✅ Do's
- **Use connection pooling** for high-throughput applications
- **Implement proper error handling** and retry logic
- **Monitor Redis metrics** regularly (memory, connections, operations)
- **Use appropriate data structures** for your use case
- **Implement proper key naming conventions**
- **Set reasonable TTL** for cached data
- **Use Redis transactions** for atomic operations
- **Implement proper backup strategies**
- **Use Redis Sentinel** for high availability
- **Monitor slow queries** and optimize them

### ❌ Don'ts
- **Don't store large objects** in Redis (use external storage)
- **Don't use Redis as primary database** for complex relational data
- **Don't run KEYS command** in production (use SCAN instead)
- **Don't use blocking operations** without timeouts
- **Don't store sensitive data** without encryption
- **Don't use default configuration** in production
- **Don't forget to handle connection failures**
- **Don't use Redis for ACID transactions** (use database)
- **Don't ignore memory limits** (configure maxmemory)
- **Don't use synchronous replication** for performance-critical writes

## Performance Tuning Guide

### Memory Optimization
```bash
# Check memory usage
docker exec myapp_redis redis-cli info memory

# Memory fragmentation
docker exec myapp_redis redis-cli memory stats

# Large key detection
docker exec myapp_redis redis-cli --bigkeys

# Memory usage by key patterns
docker exec myapp_redis redis-cli --scan --pattern "user:*" | head -1000 | xargs redis-cli memory usage
```

### Connection Optimization
```ini
# Connection settings
maxclients 10000
tcp-backlog 511
tcp-keepalive 300

# Threading (Redis 6+)
io-threads 4
io-threads-do-reads yes
```

### Persistence Optimization
```bash
# AOF rewrite monitoring
docker exec myapp_redis redis-cli info persistence

# RDB snapshot monitoring
docker exec myapp_redis redis-cli lastsave

# Background save monitoring
docker exec myapp_redis redis-cli bgsave
```

### Replication Optimization
```ini
# Replication settings
repl-diskless-sync yes
repl-diskless-sync-delay 5
repl-backlog-size 1mb
repl-timeout 60
```

## When to Apply
- Caching layer for web applications
- Session storage and management
- Real-time analytics and leaderboards
- Message queuing and pub/sub systems
- Rate limiting and API throttling
- Job queues and background processing
- Geospatial data and location services
- Time series data storage
- Event sourcing with Redis Streams
- Full-text search with Redis Search
- JSON document storage with Redis JSON
- Probabilistic data structures with Redis Bloom
- Graph data with Redis Graph
- AI/ML inference with Redis AI</content>
<parameter name="filePath">skills/docker-skill/rules/application-containers/app-redis.md