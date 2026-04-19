# Daemonization and Process Management (MEDIUM)

**Impact:** MEDIUM - Ensures reliable production deployment and process lifecycle management

**Problem:**
Celery workers need to run continuously in production environments, but manual process management leads to reliability issues, difficult monitoring, and improper resource cleanup when processes crash or need to be restarted.

**Solution:**
Use proper daemonization tools and process supervisors to manage Celery workers as reliable system services with automatic restart, logging, and monitoring capabilities.

**Examples:**

✅ **Correct: Systemd service configuration**
```ini
# /etc/systemd/system/celery-worker.service
[Unit]
Description=Celery Worker Service
After=network.target redis-server.service postgresql.service
Requires=redis-server.service postgresql.service

[Service]
Type=simple
User=celery
Group=celery
Environment=PYTHONPATH=/opt/myapp
Environment=DJANGO_SETTINGS_MODULE=myapp.settings.production
WorkingDirectory=/opt/myapp
ExecStart=/opt/myapp/venv/bin/celery -A myapp worker \
    --pool=prefork \
    --concurrency=4 \
    --loglevel=info \
    --logfile=/var/log/celery/worker.log \
    --pidfile=/var/run/celery/worker.pid \
    --statedb=/var/run/celery/worker.state
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10
LimitNOFILE=65536
LimitNPROC=65536

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=/var/log/celery /var/run/celery /opt/myapp

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl enable celery-worker
sudo systemctl start celery-worker

# Monitor service status
sudo systemctl status celery-worker

# View logs
sudo journalctl -u celery-worker -f

# Reload configuration (for beat if running)
sudo systemctl reload celery-worker
```

✅ **Correct: Supervisor configuration for multiple workers**
```ini
# /etc/supervisor/conf.d/celery.conf
[program:celery-worker]
command=/opt/myapp/venv/bin/celery -A myapp worker --pool=prefork --concurrency=4 --loglevel=info
directory=/opt/myapp
user=celery
group=celery
environment=PYTHONPATH=/opt/myapp,DJANGO_SETTINGS_MODULE=myapp.settings.production
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery/worker.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
stderr_logfile=/var/log/celery/worker.error.log
stderr_logfile_maxbytes=50MB
stderr_logfile_backups=10
priority=100

# Celery Beat scheduler
[program:celery-beat]
command=/opt/myapp/venv/bin/celery -A myapp beat --loglevel=info --scheduler=django_celery_beat.schedulers:DatabaseScheduler
directory=/opt/myapp
user=celery
group=celery
environment=PYTHONPATH=/opt/myapp,DJANGO_SETTINGS_MODULE=myapp.settings.production
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery/beat.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
priority=50

# Flower monitoring (optional)
[program:celery-flower]
command=/opt/myapp/venv/bin/celery -A myapp flower --port=5555
directory=/opt/myapp
user=celery
group=celery
environment=PYTHONPATH=/opt/myapp,DJANGO_SETTINGS_MODULE=myapp.settings.production
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/celery/flower.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
priority=25
```

```bash
# Reload supervisor configuration
sudo supervisorctl reread
sudo supervisorctl update

# Manage workers
sudo supervisorctl start celery-worker
sudo supervisorctl stop celery-worker
sudo supervisorctl restart celery-beat

# Monitor all processes
sudo supervisorctl status
```

✅ **Correct: Docker container with proper signal handling**
```dockerfile
# Dockerfile for Celery worker
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash celery

# Create necessary directories
RUN mkdir -p /var/log/celery /var/run/celery && \
    chown -R celery:celery /var/log/celery /var/run/celery

USER celery

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD celery -A myapp inspect ping --destination=celery@$HOSTNAME || exit 1

# Default command
CMD ["celery", "-A", "myapp", "worker", \
     "--pool=prefork", "--concurrency=2", \
     "--loglevel=info", "--hostname=worker@%h"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  celery-worker:
    build: .
    command: celery -A myapp worker --pool=prefork --concurrency=2 --loglevel=info
    environment:
      - DJANGO_SETTINGS_MODULE=myapp.settings.production
    volumes:
      - ./logs:/var/log/celery
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "celery", "-A", "myapp", "inspect", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  celery-beat:
    build: .
    command: celery -A myapp beat --loglevel=info
    environment:
      - DJANGO_SETTINGS_MODULE=myapp.settings.production
    volumes:
      - ./logs:/var/log/celery
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
```

✅ **Correct: Multi-worker deployment with load balancing**
```python
# deploy_workers.py - Automated worker deployment
import subprocess
import os

def deploy_workers():
    """Deploy multiple worker types with different configurations"""
    worker_configs = [
        {
            'name': 'cpu-worker',
            'queues': ['cpu'],
            'concurrency': 4,
            'pool': 'prefork',
            'hostname': 'cpu-worker@%h'
        },
        {
            'name': 'io-worker',
            'queues': ['io'],
            'concurrency': 20,
            'pool': 'gevent',
            'hostname': 'io-worker@%h'
        },
        {
            'name': 'priority-worker',
            'queues': ['priority'],
            'concurrency': 2,
            'pool': 'prefork',
            'hostname': 'priority-worker@%h'
        }
    ]

    processes = []

    for config in worker_configs:
        cmd = [
            'celery', '-A', 'myapp', 'worker',
            '--pool', config['pool'],
            '--concurrency', str(config['concurrency']),
            '--queues', ','.join(config['queues']),
            '--hostname', config['hostname'],
            '--loglevel', 'info'
        ]

        # Start worker process
        proc = subprocess.Popen(cmd, env=os.environ.copy())
        processes.append((config['name'], proc))

    return processes

# Graceful shutdown handling
import signal
import sys

def signal_handler(signum, frame):
    print(f"Received signal {signum}, shutting down workers...")
    for name, proc in processes:
        print(f"Terminating {name}...")
        proc.terminate()

    # Wait for graceful shutdown
    for name, proc in processes:
        try:
            proc.wait(timeout=30)
            print(f"{name} stopped gracefully")
        except subprocess.TimeoutExpired:
            print(f"{name} didn't stop gracefully, killing...")
            proc.kill()

    sys.exit(0)

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

if __name__ == '__main__':
    processes = deploy_workers()

    # Keep running
    try:
        for name, proc in processes:
            proc.wait()
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)
```

❌ **Wrong: Manual worker management**
```bash
# Don't run workers manually in production
celery -A myapp worker --loglevel=info &

# No process monitoring, no automatic restart
# No proper logging, no resource limits
# Difficult to manage multiple workers
```

❌ **Wrong: Running as root**
```ini
# Security risk - never run Celery as root
[Service]
User=root  # DANGER!
Group=root
```

**Common mistakes:**
- Running workers manually without process supervision
- Not configuring proper resource limits and security settings
- Missing health checks and monitoring integration
- Not handling graceful shutdown properly
- Running all worker types with the same configuration

**When to apply:**
- Production deployments
- Setting up development environments with multiple workers
- Implementing high availability and redundancy
- Managing worker lifecycle and resource usage
- Integrating with monitoring and alerting systems

**Related rules:**
- `worker-lifecycle-management`: Worker process lifecycle
- `monitoring-health-checks`: Health monitoring integration
- `remote-control-inspection`: Runtime worker management</content>
<parameter name="filePath">skills/celery-skill/rules/daemonization-process-management.md