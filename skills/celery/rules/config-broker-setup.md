# Configuration Broker Setup (CRITICAL)

**Impact:** CRITICAL - Ensures reliable message delivery and system stability

**Problem:**
Improper broker configuration can lead to message loss, connection failures, and unreliable task execution. Celery applications depend on robust message broker setup for distributed task processing.

**Solution:**
Configure Redis or RabbitMQ brokers with proper connection settings, persistence, and reliability features. Use connection pooling and implement retry mechanisms for broker connections.

**Examples:**

✅ **Correct: Redis broker configuration**
```python
# settings.py or celeryconfig.py
from celery import Celery

app = Celery('myapp')

# Redis broker with proper configuration
app.conf.update(
    broker_url='redis://localhost:6379/0',
    broker_transport_options={
        'master_name': 'mymaster',  # For Redis Sentinel
        'socket_timeout': 5,
        'socket_connect_timeout': 5,
        'socket_keepalive': True,
        'socket_keepalive_options': {
            'TCP_KEEPIDLE': 60,
            'TCP_KEEPINTVL': 10,
            'TCP_KEEPCNT': 3,
        },
        'health_check_interval': 30,
    },
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
    broker_connection_max_retries=10,
)
```

✅ **Correct: RabbitMQ broker configuration**
```python
app.conf.update(
    broker_url='amqp://guest:guest@localhost:5672/',
    broker_transport_options={
        'confirm_publish': True,  # Publisher confirms
        'max_retries': 3,
        'interval_start': 0,
        'interval_step': 0.2,
        'interval_max': 0.5,
    },
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
)
```

❌ **Wrong: Basic broker URL without resilience**
```python
# Insufficient for production
app.conf.broker_url = 'redis://localhost:6379/0'
# Missing connection pooling, retries, and error handling
```

**Common mistakes:**
- Using default broker URLs without connection parameters
- Not enabling publisher confirms for reliable delivery
- Missing connection retry configuration
- Not configuring connection pooling for high throughput
- Ignoring broker-specific optimization settings

**When to apply:**
- Initial Celery setup and configuration
- Deploying to production environments
- Troubleshooting connection issues
- Performance optimization
- High availability deployments

**Related rules:**
- `config-result-backend`: Result backend configuration
- `config-environment-separation`: Environment-specific configurations
- `perf-connection-pooling`: Connection management</content>
<parameter name="filePath">skills/celery-skill/rules/config-broker-setup.md