---
title: Celery Containerization
impact: CRITICAL
impactDescription: Ensures reliable Celery worker deployment in containers
tags: docker, celery, containerization, workers, deployment
---

## Celery Containerization

**Problem:**
Celery workers require proper containerization for broker connections, result backends, logging, and graceful shutdown. Incorrect containerization leads to connection issues, memory leaks, and unreliable task processing.

**Solution:**
Implement Celery-specific containerization with proper broker configuration, logging, and production-ready worker settings.

❌ **Wrong: Basic Celery containerization**
```dockerfile
FROM python:3.9
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD celery worker -A tasks
```

✅ **Correct: Production Celery containerization**
```dockerfile
# ================================
# Build stage
# ================================
FROM python:3.11-slim-bookworm AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        && \
    rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ================================
# Production stage
# ================================
FROM python:3.11-slim-bookworm AS production

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Create Celery user
RUN groupadd -r celery && useradd -r -g celery celery

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Celery environment variables
ENV CELERY_BROKER_URL=redis://redis:6379/0
ENV CELERY_RESULT_BACKEND=redis://redis:6379/0
ENV CELERY_TIMEZONE=UTC
ENV CELERY_TASK_TRACK_STARTED=true
ENV CELERY_TASK_TIME_LIMIT=3600
ENV CELERY_TASK_SOFT_TIME_LIMIT=3300

# Logging configuration
ENV CELERY_WORKER_LOG_FORMAT="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s"
ENV CELERY_WORKER_TASK_LOG_FORMAT="[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s"

# Create application directory
WORKDIR /app
RUN chown -R celery:celery /app

# Copy application code
COPY --chown=celery:celery . .

# Health check for Celery worker
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
    CMD celery -A myproject inspect ping || exit 1

# Switch to Celery user
USER celery

# Default command for worker
CMD ["celery", "-A", "myproject", "worker", \
     "--loglevel=info", \
     "--concurrency=4", \
     "--pool=prefork", \
     "--max-tasks-per-child=1000", \
     "--time-limit=3600", \
     "--soft-time-limit=3300", \
     "--hostname=worker@%h"]
```

**Celery-specific considerations:**
- **Broker configuration**: Redis/RabbitMQ connection settings
- **Result backend**: Task result storage configuration
- **Worker settings**: Concurrency, pool type, task limits
- **Logging**: Structured logging for debugging
- **Health checks**: Worker ping for monitoring
- **User permissions**: Non-root execution
- **Signal handling**: Proper shutdown handling

**Worker configuration options:**
```python
# celeryconfig.py - Advanced configuration
broker_url = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
result_backend = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

timezone = 'UTC'
enable_utc = True

# Task settings
task_track_started = True
task_time_limit = 3600  # 1 hour
task_soft_time_limit = 3300  # 55 minutes
task_acks_late = True
task_reject_on_worker_lost = True

# Worker settings
worker_prefetch_multiplier = 1
worker_max_tasks_per_child = 1000
worker_disable_rate_limits = False

# Result serialization
result_serializer = 'json'
accept_content = ['json']
task_serializer = 'json'

# Routing
task_routes = {
    'myapp.tasks.heavy_task': {'queue': 'heavy'},
    'myapp.tasks.light_task': {'queue': 'light'},
}

# Error handling
task_annotations = {
    '*': {
        'rate_limit': '100/m',
        'acks_late': True,
        'reject_on_worker_lost': True,
    }
}
```

**Multiple worker types:**
```dockerfile
# High-priority worker
FROM celery-base AS high-priority-worker
CMD ["celery", "-A", "myproject", "worker", \
     "--loglevel=info", \
     "--concurrency=2", \
     "--pool=solo", \
     "--queues=high-priority", \
     "--hostname=high-priority@%h"]

# Batch processing worker
FROM celery-base AS batch-worker
CMD ["celery", "-A", "myproject", "worker", \
     "--loglevel=info", \
     "--concurrency=1", \
     "--pool=solo", \
     "--queues=batch", \
     "--hostname=batch@%h"]

# Beat scheduler
FROM celery-base AS celery-beat
CMD ["celery", "-A", "myproject", "beat", \
     "--loglevel=info", \
     "--scheduler=django_celery_beat.schedulers:DatabaseScheduler"]
```

**Docker Compose for Celery:**
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  celery-worker:
    build:
      context: .
      dockerfile: Dockerfile.celery
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
    volumes:
      - .:/app
    depends_on:
      - redis
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure

  celery-beat:
    build:
      context: .
      dockerfile: Dockerfile.beat
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
    volumes:
      - .:/app
    depends_on:
      - redis
    profiles: ["beat"]  # Optional service

volumes:
  redis_data:
```

**Monitoring and logging:**
```python
# tasks.py - Monitoring integration
from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure

app = Celery('myproject')

@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kw):
    logger.info(f"Task {task.name}[{task_id}] started")

@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, retval=None, state=None, **kw):
    logger.info(f"Task {task.name}[{task_id}] completed with state {state}")

@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, args=None, kwargs=None, traceback=None, einfo=None, **kw):
    logger.error(f"Task {task.name}[{task_id}] failed: {exception}")

# Custom task base class
class MonitoredTask(app.Task):
    def on_success(self, retval, task_id, args, kwargs):
        logger.info(f"Task {self.name}[{task_id}] succeeded")

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {self.name}[{task_id}] failed: {exc}")

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning(f"Task {self.name}[{task_id}] retrying: {exc}")
```

**Common mistakes:**
- Not setting proper task time limits
- Using wrong worker pool type
- Missing broker connection configuration
- Not implementing proper logging
- Running Celery as root user
- Not configuring result backend

**When to apply:**
- Background task processing deployment
- Distributed job queues
- Asynchronous task execution
- Periodic task scheduling
- Task result tracking and monitoring