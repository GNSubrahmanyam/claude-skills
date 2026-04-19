---
title: Docker Compose Networking
impact: HIGH
impactDescription: Enables secure and efficient inter-container communication
tags: docker, compose, networking, security, inter-container
---

## Docker Compose Networking

**Problem:**
Multi-service applications need proper networking for communication, but default Docker networking can expose services unnecessarily and create security vulnerabilities.

**Solution:**
Implement secure Docker Compose networking with service isolation, proper DNS resolution, and network segmentation following Docker networking best practices.

❌ **Wrong: Insecure networking**
```yaml
services:
  web:
    image: nginx
  api:
    image: myapi
  db:
    image: postgres
# All services on default network - exposed to each other
```

✅ **Correct: Secure Docker Compose networking**
```yaml
version: '3.8'

services:
  # Public-facing services
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - public
    depends_on:
      - web
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s

  # Application services (internal)
  web:
    image: myapp/web:latest
    environment:
      - API_URL=http://api:8000
      - CACHE_URL=redis://cache:6379
    networks:
      - app
      - public  # For nginx communication
    depends_on:
      api:
        condition: service_healthy
      cache:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s

  api:
    image: myapp/api:latest
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/myapp
      - REDIS_URL=redis://cache:6379
    networks:
      - app
    depends_on:
      postgres:
        condition: service_healthy
      cache:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s

  # Background services
  worker:
    image: myapp/worker:latest
    environment:
      - CELERY_BROKER_URL=redis://cache:6379/0
      - CELERY_RESULT_BACKEND=redis://cache:6379/0
    networks:
      - app
    depends_on:
      cache:
        condition: service_healthy
    command: ["celery", "-A", "app.worker", "worker"]
    healthcheck:
      test: ["CMD", "celery", "-A", "app.worker", "inspect", "ping"]
      interval: 60s

  # Data services (isolated)
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - database
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 30s

  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - app
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s

  # Monitoring (separate network)
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    networks:
      - monitoring
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    networks:
      - monitoring
      - public  # For external access
    ports:
      - "3000:3000"

volumes:
  postgres_data:
  redis_data:

networks:
  # Public network (external access)
  public:
    driver: bridge
    name: myapp_public

  # Application network (internal services)
  app:
    driver: bridge
    name: myapp_app
    internal: false  # Allow inter-service communication

  # Database network (isolated)
  database:
    driver: bridge
    name: myapp_database
    internal: true  # No external access

  # Monitoring network (isolated)
  monitoring:
    driver: bridge
    name: myapp_monitoring
    internal: true
```

**Network configuration options:**
```yaml
networks:
  # Basic bridge network
  app_network:
    driver: bridge

  # Advanced bridge network
  secure_network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: my_bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
          ip_range: 172.20.0.0/24

  # Overlay network (for Swarm)
  overlay_net:
    driver: overlay
    attachable: true
    labels:
      com.example.environment: production

  # MACVLAN network (advanced)
  macvlan_net:
    driver: macvlan
    driver_opts:
      parent: eth0
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
```

**Service discovery and DNS:**
```yaml
# Automatic DNS resolution
services:
  web:
    # Can reach api as 'api' or 'api:8000'
    environment:
      - API_ENDPOINT=http://api:8000

  api:
    # Can reach database as 'postgres' or 'postgres:5432'
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
```

**Network security:**
```bash
# Create networks with security
docker network create --driver bridge --internal secure_net
docker network create --driver bridge --opt com.docker.network.bridge.name=my_bridge app_net

# Inspect networks
docker network ls
docker network inspect app_net

# Connect/disconnect containers
docker network connect secure_net my_container
docker network disconnect bridge my_container
```

**Cross-network communication:**
```yaml
# Services communicating across networks
services:
  api-gateway:
    networks:
      - public
      - app
      - monitoring

  metrics-collector:
    networks:
      - app
      - monitoring
    # Can access both app services and monitoring
```

**Network aliases and links:**
```yaml
services:
  web:
    networks:
      app:
        aliases:
          - webapp
          - frontend

  api:
    networks:
      app:
        aliases:
          - backend
          - api-server

  # Legacy linking (deprecated but still works)
  legacy_app:
    links:
      - db:database
      - cache:redis
```

**Network troubleshooting:**
```bash
# Check container networking
docker inspect my_container | jq '.NetworkSettings.Networks'

# Test connectivity
docker exec web ping api
docker exec api nslookup postgres

# Network debugging
docker network ls
docker network inspect bridge

# DNS resolution test
docker exec web nslookup api
docker exec web cat /etc/resolv.conf
```

**Performance optimization:**
```yaml
# High-performance networking
services:
  high_perf_app:
    networks:
      app:
        # Use host networking for performance (advanced)
        # driver: host

  optimized_db:
    networks:
      database:
        # Custom MTU for network performance
        driver_opts:
          com.docker.network.driver.mtu: 1450
```

**Common mistakes:**
- Using default bridge for all services
- Not isolating sensitive services
- Exposing database ports externally
- Missing health checks for dependencies
- Ignoring DNS resolution issues

**When to apply:**
- Multi-service application architectures
- Microservices communication
- Security isolation requirements
- Service discovery implementation
- Network performance optimization