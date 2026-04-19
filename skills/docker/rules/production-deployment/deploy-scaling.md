# Scaling and Load Balancing (HIGH)

**Impact:** HIGH - Enables horizontal scaling and high availability for containerized applications

**Problem:**
Single container instances can't handle high traffic or provide fault tolerance. Applications need scaling capabilities for reliability and performance.

**Solution:**
Implement container scaling with load balancing, health checks, and rolling updates for high availability using Docker Swarm or Kubernetes patterns.

❌ **Wrong: Single instance deployment**
```yaml
services:
  web:
    image: myapp
    ports:
      - "80:8000"
# No scaling, load balancing, or fault tolerance
```

✅ **Correct: Scaled container deployment**
```yaml
version: '3.8'

services:
  # Load balancer
  nginx:
    image: nginx:1.24-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - web
    networks:
      - public
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.25'
        reservations:
          memory: 128M
          cpus: '0.1'

  # Application containers (scaled)
  web:
    image: myregistry.com/myapp:${APP_VERSION:-latest}
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/myapp
    volumes:
      - ./config:/app/config:ro
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal
      - public  # For nginx
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      mode: replicated
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
      update_config:
        parallelism: 1
        delay: 30s
        failure_action: rollback
        monitor: 60s
        max_failure_ratio: 0.25
      resources:
        limits:
          memory: 512M
          cpus: '0.75'
        reservations:
          memory: 256M
          cpus: '0.5'
      placement:
        constraints:
          - node.role == worker
        preferences:
          - spread: node.labels.zone

  # Background workers (scaled)
  worker:
    image: myregistry.com/myapp:${APP_VERSION:-latest}
    environment:
      - WORKER_TYPE=background
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0
    volumes:
      - ./config:/app/config:ro
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - internal
    command: ["celery", "-A", "app.worker", "worker", "-l", "info"]
    healthcheck:
      test: ["CMD", "celery", "-A", "app.worker", "inspect", "ping"]
      interval: 60s
      timeout: 10s
      retries: 3
    deploy:
      mode: replicated
      replicas: 2
      restart_policy:
        condition: on-failure
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  # Database (not scaled, single instance)
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      placement:
        constraints:
          - node.role == manager  # Run on manager node

  # Cache (not scaled, single instance with replication)
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - internal
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      placement:
        constraints:
          - node.role == manager

volumes:
  postgres_data:
  redis_data:

networks:
  public:
    driver: bridge
  internal:
    driver: bridge
    internal: true
```

**Scaling strategies:**
```yaml
# Auto-scaling based on CPU
deploy:
  replicas: 2
  resources:
    limits:
      cpus: '0.5'
    reservations:
      cpus: '0.25'

# Manual scaling commands
docker-compose up -d --scale web=5
docker-compose up -d --scale worker=3

# Docker Swarm auto-scaling (experimental)
version: '3.8'
services:
  web:
    image: myapp/web
    deploy:
      replicas: 2
      labels:
        - "com.docker.service.autoscaling=true"
        - "com.docker.service.autoscaling.min=2"
        - "com.docker.service.autoscaling.max=10"
```

**Load balancing configuration:**
```nginx
# nginx.conf - Load balancer configuration
upstream app_backend {
    least_conn;  # Least connections algorithm

    server web:8000 weight=1 max_fails=3 fail_timeout=30s;
    server web:8000 weight=1 max_fails=3 fail_timeout=30s;
    server web:8000 weight=1 max_fails=3 fail_timeout=30s;

    keepalive 32;
}

server {
    listen 80;
    server_name myapp.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://app_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;

        # Health checks
        health_check interval=10s;
    }

    # Static files
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

**Rolling updates:**
```bash
# Zero-downtime deployment
# 1. Build new image
docker build -t myapp:1.2.3 .

# 2. Update service with rolling update
docker-compose up -d --no-deps web

# 3. Monitor rollout
docker-compose ps
docker-compose logs -f web

# 4. Check health
curl http://localhost/health

# 5. Rollback if needed
docker-compose up -d --no-deps --scale web=0
docker tag myapp:1.2.2 myapp:latest
docker-compose up -d --scale web=3
```

**Health checks and monitoring:**
```yaml
# Advanced health checks
services:
  web:
    healthcheck:
      test: ["CMD-SHELL", "
        curl -f http://localhost:8000/health && \
        curl -f http://localhost:8000/api/status && \
        ps aux | grep -q '[g]unicorn'
      "]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
      disable: false

  # Monitoring stack
  prometheus:
    image: prom/prometheus:v2.40.0
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
    networks:
      - monitoring
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.25'

  grafana:
    image: grafana/grafana:9.3.0
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - monitoring
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.25'
```

**High availability patterns:**
```yaml
# Multi-zone deployment
services:
  web-us-east:
    image: myapp/web
    deploy:
      placement:
        constraints:
          - node.labels.region == us-east
      replicas: 2

  web-us-west:
    image: myapp/web
    deploy:
      placement:
        constraints:
          - node.labels.region == us-west
      replicas: 2

  # Global load balancer
  nginx-global:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx-global.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - web-us-east
      - web-us-west
```

**Scaling best practices:**
- **Start small**: Begin with 2-3 replicas and scale based on metrics
- **Resource limits**: Always set memory and CPU limits
- **Health checks**: Implement comprehensive health checks
- **Rolling updates**: Use rolling updates for zero-downtime deployments
- **Monitoring**: Monitor resource usage and application metrics
- **Load testing**: Test scaling behavior under load
- **Auto-scaling**: Implement automatic scaling based on metrics

**Common mistakes:**
- Scaling stateful services like databases
- Not implementing proper health checks
- Missing resource limits leading to resource exhaustion
- Ignoring network latency between scaled services
- Not testing failover scenarios

**When to apply:**
- High-traffic web applications
- Microservices architectures
- API services with variable load
- Background job processing
- Real-time applications