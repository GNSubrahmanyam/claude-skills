# Advanced Performance Optimization (MEDIUM-HIGH)

**Impact:** MEDIUM-HIGH - Maximizes throughput and minimizes resource usage in high-performance scenarios

**Problem:**
Basic concurrency tuning isn't sufficient for high-performance Celery deployments. Advanced optimization techniques are needed to handle high-throughput scenarios, minimize latency, and optimize resource utilization across complex distributed systems.

**Solution:**
Implement advanced performance optimization techniques including prefetch tuning, connection pooling optimization, task chunking, result backend optimization, and worker pool specialization.

**Examples:**

✅ **Correct: Advanced prefetch and acknowledgment optimization**
```python
# Advanced worker configuration for high throughput
app.conf.update(
    # Prefetch multiplier optimization
    worker_prefetch_multiplier=1,  # Conservative prefetching

    # Acknowledgment strategy for high throughput
    task_acks_late=True,           # Acknowledge after execution
    task_acks_on_failure_or_timeout=True,  # Acknowledge on failure
    worker_disable_rate_limits=False,

    # Connection optimization
    broker_pool_limit=20,          # More connections for high throughput
    broker_connection_retry=True,
    broker_connection_max_retries=10,

    # Result backend optimization
    result_backend_transport_options={
        'master_name': 'mymaster',
        'socket_timeout': 5.0,
        'socket_connect_timeout': 5.0,
        'socket_keepalive': True,
        'socket_keepalive_options': {
            'TCP_KEEPIDLE': 60,
            'TCP_KEEPINTVL': 10,
            'TCP_KEEPCNT': 3,
        },
        'health_check_interval': 30,
        'retry_on_timeout': True,
        'max_connections': 50,      # Connection pool size
    },

    # Task execution optimization
    task_time_limit=3600,          # 1 hour max
    task_soft_time_limit=3300,     # 55 minutes soft limit
    task_default_retry_delay=60,   # 1 minute retry delay

    # Worker optimization
    worker_max_tasks_per_child=1000,  # Restart worker after N tasks
    worker_max_memory_per_child=500000,  # 500MB memory limit (KB)
    worker_disable_rate_limits=False,
    worker_send_task_events=True,   # Enable events for monitoring
)
```

✅ **Correct: Task chunking for large datasets**
```python
@app.task
def process_large_dataset(dataset_id):
    """Process large dataset with intelligent chunking"""
    dataset = Dataset.objects.get(id=dataset_id)

    # Calculate optimal chunk size based on worker capacity
    total_items = dataset.items.count()
    worker_concurrency = app.conf.worker_concurrency or 4
    chunk_size = min(1000, max(100, total_items // (worker_concurrency * 4)))

    # Create chunks
    chunks = []
    items = list(dataset.items.values_list('id', flat=True))
    for i in range(0, len(items), chunk_size):
        chunks.append(items[i:i + chunk_size])

    # Process chunks in parallel using chord
    from celery import chord, group

    @app.task
    def process_chunk(chunk_item_ids):
        """Process a chunk of items"""
        processed = 0
        for item_id in chunk_item_ids:
            try:
                item = DatasetItem.objects.get(id=item_id)
                # Process item
                processed_item = process_single_item(item)
                processed += 1
            except Exception as e:
                logger.error(f"Failed to process item {item_id}: {e}")

        return processed

    # Execute chunked processing
    callback = aggregate_results.s(dataset_id)

    # Use chord for parallel processing with aggregation
    workflow = chord(
        group(process_chunk.s(chunk) for chunk in chunks),
        callback
    )

    return workflow.apply_async()

@app.task
def aggregate_results(chunk_results, dataset_id):
    """Aggregate results from all chunks"""
    dataset = Dataset.objects.get(id=dataset_id)
    total_processed = sum(chunk_results)

    dataset.processed_count = total_processed
    dataset.status = 'completed'
    dataset.completed_at = timezone.now()
    dataset.save()

    return {
        'dataset_id': dataset_id,
        'total_processed': total_processed,
        'chunks_processed': len(chunk_results)
    }
```

✅ **Correct: Result backend performance optimization**
```python
# High-performance result backend configuration
app.conf.update(
    result_backend='redis://localhost:6379/1',

    # Result caching and compression
    result_cache_max=10000,        # Cache up to 10k results
    result_compression='gzip',     # Compress results
    result_serializer='json',      # Fast serialization

    # Expiration policies
    result_expires={
        'myapp.tasks.quick_result': 300,     # 5 minutes
        'myapp.tasks.important_result': 3600, # 1 hour
        'myapp.tasks.archive_result': 86400,  # 24 hours
        '*': 1800,  # 30 minutes default
    },

    # Extended result metadata for performance monitoring
    result_extended=True,
)

# Custom result backend with performance optimizations
from celery.backends.redis import RedisBackend

class OptimizedRedisBackend(RedisBackend):
    """Redis backend with performance optimizations"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Custom connection pool settings
        self.connparams.update({
            'socket_timeout': 5.0,
            'socket_connect_timeout': 5.0,
            'socket_keepalive': True,
            'socket_keepalive_options': {
                'TCP_KEEPIDLE': 60,
                'TCP_KEEPINTVL': 10,
                'TCP_KEEPCNT': 3,
            },
            'health_check_interval': 30,
        })

    def set(self, key, value, **kwargs):
        """Optimized set with compression"""
        # Compress large results
        if len(str(value)) > 1000:  # Compress results over 1KB
            import gzip
            compressed = gzip.compress(str(value).encode())
            super().set(key, compressed, **kwargs)
            # Store compression flag
            super().set(f"{key}:compressed", True, **kwargs)
        else:
            super().set(key, value, **kwargs)

    def get(self, key, **kwargs):
        """Optimized get with decompression"""
        result = super().get(key, **kwargs)

        # Check if result is compressed
        if super().get(f"{key}:compressed"):
            import gzip
            result = gzip.decompress(result).decode()

        return result

# Use optimized backend
app.conf.result_backend = 'myapp.backends.OptimizedRedisBackend'
```

✅ **Correct: Connection pooling and resource management**
```python
# Advanced connection pooling configuration
app.conf.update(
    # Broker connection pooling
    broker_pool_limit=50,          # Max connections per worker
    broker_connection_timeout=30,   # Connection timeout
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,

    # Redis-specific optimizations
    redis_max_connections=100,      # Redis connection pool
    redis_socket_timeout=5.0,
    redis_socket_connect_timeout=5.0,
    redis_socket_keepalive=True,
    redis_retry_on_timeout=True,

    # Database result backend pooling (for Django)
    database_engine_options={
        'pool_pre_ping': True,      # Verify connections
        'pool_recycle': 3600,       # Recycle connections
        'pool_size': 20,            # Connection pool size
        'max_overflow': 30,         # Max overflow connections
        'pool_timeout': 30,         # Connection timeout
    }
)

# Custom connection pool management
from celery.signals import worker_process_init, worker_process_shutdown

@worker_process_init.connect
def setup_connection_pools(**kwargs):
    """Setup optimized connection pools"""
    # Warm up database connections
    from django.db import connections
    for conn in connections.all():
        conn.close()  # Force new connections with pool settings

    # Pre-warm Redis connections
    if hasattr(app, 'backend') and 'redis' in str(app.backend):
        app.backend.client.connection_pool.disconnect()

@worker_process_shutdown.connect
def cleanup_connection_pools(**kwargs):
    """Cleanup connection pools"""
    # Close all connections gracefully
    from django.db import connections
    for conn in connections.all():
        conn.close()

    # Disconnect Redis pool
    if hasattr(app, 'backend') and hasattr(app.backend, 'disconnect'):
        app.backend.disconnect()
```

✅ **Correct: Task routing optimization for performance**
```python
# Performance-optimized routing configuration
app.conf.task_routes = {
    # Route by task characteristics
    'myapp.tasks.cpu_intensive': {
        'queue': 'cpu',
        'routing_key': 'cpu',
        'exchange': 'cpu_exchange',
        'exchange_type': 'direct'
    },
    'myapp.tasks.io_intensive': {
        'queue': 'io',
        'routing_key': 'io',
        'exchange': 'io_exchange',
        'exchange_type': 'direct'
    },
    'myapp.tasks.memory_intensive': {
        'queue': 'memory',
        'routing_key': 'memory',
        'exchange': 'memory_exchange',
        'exchange_type': 'direct'
    },

    # Priority-based routing
    'myapp.tasks.urgent': {
        'queue': 'priority_high',
        'routing_key': 'priority_high',
        'priority': 9
    },
    'myapp.tasks.normal': {
        'queue': 'priority_normal',
        'routing_key': 'priority_normal',
        'priority': 5
    },
    'myapp.tasks.background': {
        'queue': 'priority_low',
        'routing_key': 'priority_low',
        'priority': 1
    },
}

# Custom routing function for dynamic optimization
def performance_router(name, args, kwargs, options, task=None):
    """Route tasks based on performance characteristics"""
    # Analyze task arguments for routing decisions
    task_size = len(str(args)) + len(str(kwargs))

    if task_size > 10000:  # Large task
        return {'queue': 'large_tasks', 'routing_key': 'large'}
    elif name.endswith('.quick'):
        return {'queue': 'fast_lane', 'routing_key': 'fast'}
    else:
        return {'queue': 'default', 'routing_key': 'default'}

app.conf.task_routes = [performance_router]
```

❌ **Wrong: Over-optimization leading to complexity**
```python
# Over-engineered optimization
app.conf.update(
    worker_prefetch_multiplier=0.5,  # Too conservative
    broker_pool_limit=200,          # Excessive connections
    worker_max_tasks_per_child=100, # Restart too frequently
    result_cache_max=100000,       # Cache too much
    # Leads to resource waste and management complexity
)
```

❌ **Wrong: Ignoring performance monitoring**
```python
# Optimizing without measuring
app.conf.worker_prefetch_multiplier = 10  # Blind optimization
# No monitoring to verify if this helps or hurts
```

**Common mistakes:**
- Setting prefetch multiplier too high or low without testing
- Over-configuring connection pools leading to resource exhaustion
- Not monitoring the impact of optimization changes
- Optimizing one bottleneck while creating others
- Ignoring the cost of optimization complexity

**When to apply:**
- High-throughput task processing scenarios
- Large-scale distributed systems
- Performance-critical applications
- Resource-constrained environments
- Real-time processing requirements

**Related rules:**
- `perf-concurrency-tuning`: Basic performance tuning
- `routing-task-distribution`: Task routing optimization
- `monitoring-health-checks`: Performance monitoring</content>
<parameter name="filePath">skills/celery-skill/rules/advanced-performance-optimization.md