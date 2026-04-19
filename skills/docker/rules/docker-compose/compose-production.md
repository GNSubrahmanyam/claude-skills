---
title: Docker Compose Production
impact: HIGH
impactDescription: Enables reliable production multi-service deployments
tags: docker, compose, production, deployment, orchestration
---

## Docker Compose Production

**Problem:**
Production deployments require proper service orchestration, health checks, resource limits, and security configurations. Simple development setups don't scale to production requirements.

**Solution:**
Implement production-ready Docker Compose configurations with security, monitoring, resource management, and high availability features.

❌ **Wrong: Development-focused production**
```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    ports:
      - "80:8000"
```

✅ **Correct: Production Docker Compose**
```yaml
version: '3.8'

services:
  # Reverse proxy
  nginx:
    image: nginx:1.24-alpine
    restart: unless-stopped
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
      - app_static:/var/www/static:ro
      - app_media:/var/www/media:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - app
    networks:
      - web
      - app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/nginx-health"]
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

  # Application
  app:
    image: myregistry.com/myapp:${APP_VERSION:-latest}
    restart: unless-stopped
    environment:
      - ENVIRONMENT=production
      - SECRET_KEY=${SECRET_KEY}
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/0
    volumes:
      - app_static:/app/static
      - app_media:/app/media
      - ./config/production.py:/app/config/production.py:ro
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health/"]
      interval: 30s
      timeout: 10s
      start_period: 60s
      retries: 3
    deploy:
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
          memory: 1G
          cpus: '0.75'
        reservations:
          memory: 512M
          cpus: '0.5'
      placement:
        constraints:
          - node.role == worker

  # Database
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
      - postgres_backups:/backups
    networks:
      - app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  # Cache
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --tcp-keepalive 300
      --timeout 300
    volumes:
      - redis_data:/data
    networks:
      - app
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.25'
        reservations:
          memory: 256M
          cpus: '0.1'

  # Background workers
  celery-worker:
    image: myregistry.com/myapp:${APP_VERSION:-latest}
    restart: unless-stopped
    environment:
      - ENVIRONMENT=production
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/0
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
    volumes:
      - ./config/production.py:/app/config/production.py:ro
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app
    command: >
      celery -A myproject worker
      --loglevel=info
      --concurrency=4
      --pool=prefork
      --max-tasks-per-child=1000
      --time-limit=3600
      --soft-time-limit=3300
      --hostname=worker@%h
    healthcheck:
      test: ["CMD", "celery", "-A", "myproject", "inspect", "ping"]
      interval: 60s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'

  # Periodic tasks
  celery-beat:
    image: myregistry.com/myapp:${APP_VERSION:-latest}
    restart: unless-stopped
    environment:
      - ENVIRONMENT=production
      - CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
    volumes:
      - ./config/production.py:/app/config/production.py:ro
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app
    command: celery -A myproject beat --loglevel=info --scheduler=django_celery_beat.schedulers:DatabaseScheduler
    deploy:
      replicas: 1
      resources:
        limits:
          memory: 256M
          cpus: '0.1'
        reservations:
          memory: 128M
          cpus: '0.05'

  # Monitoring
  prometheus:
    image: prom/prometheus:v2.40.0
    restart: unless-stopped
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    networks:
      - monitoring
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:9090/-/healthy"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.25'

  grafana:
    image: grafana/grafana:9.3.0
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
    networks:
      - monitoring
      - web
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.25'

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  app_static:
    driver: local
  app_media:
    driver: local
  nginx_logs:
    driver: local
  postgres_backups:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

networks:
  web:
    driver: bridge
  app:
    driver: bridge
    internal: true
  monitoring:
    driver: bridge
```

**Production considerations:**
- **Environment variables**: Use for secrets and configuration
- **Health checks**: Comprehensive monitoring for all services
- **Resource limits**: Prevent resource exhaustion
- **Rolling updates**: Zero-downtime deployments
- **Security**: Internal networks, no unnecessary port exposure
- **Monitoring**: Prometheus and Grafana integration
- **Backup volumes**: Data persistence and recovery
- **Load balancing**: Multiple app replicas behind nginx

**Deployment strategy:**
```bash
# Environment file
cp .env.example .env
# Edit .env with production values

# Build and deploy
export APP_VERSION=1.2.3
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Check health
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale app=5

# Zero-downtime updates
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# Rollback if needed
docker-compose -f docker-compose.prod.yml up -d --no-deps --scale app=0
docker tag myregistry.com/myapp:1.2.2 myregistry.com/myapp:latest
docker-compose -f docker-compose.prod.yml up -d --scale app=3
```

**Common mistakes:**
- Using development configurations in production
- Not setting resource limits
- Exposing unnecessary ports
- Missing health checks
- Not implementing proper logging
- Ignoring security hardening

**When to apply:**
- Production application deployments
- Multi-environment management
- Microservices orchestration
- High-availability requirements
- Enterprise-scale applications