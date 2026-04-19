---
title: Container Networking
impact: MEDIUM
impactDescription: Enables reliable inter-container communication and security
tags: docker, networking, containers, inter-container, security
---

## Container Networking

**Problem:**
Containers need secure and reliable networking for communication. Poor network configuration leads to connectivity issues, security vulnerabilities, and performance problems.

**Solution:**
Implement proper container networking with service discovery, security, and performance optimization.

❌ **Wrong: Default networking**
```yaml
version: '3.8'
services:
  web:
    image: nginx
  api:
    image: myapp
  db:
    image: postgres
# All on default network - insecure
```

✅ **Correct: Secure container networking**
```yaml
version: '3.8'

services:
  # Load balancer - external access
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

  # Web application - internal only
  web:
    image: myapp/web:latest
    environment:
      - API_URL=http://api:8000
    networks:
      - internal
      - public  # For nginx communication
    depends_on:
      - api
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s

  # API service - internal only
  api:
    image: myapp/api:latest
    environment:
      - DATABASE_URL=postgresql://db:5432/myapp
      - REDIS_URL=redis://cache:6379
    networks:
      - internal
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s

  # Database - isolated network
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - database
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 30s

  # Cache - shared with API
  cache:
    image: redis:7-alpine
    networks:
      - internal
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s

  # Monitoring - separate network
  prometheus:
    image: prom/prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    networks:
      - monitoring
    ports:
      - "9090:9090"

networks:
  public:
    driver: bridge
    # External access allowed

  internal:
    driver: bridge
    internal: false  # Allow inter-service communication
    # No external access

  database:
    driver: bridge
    internal: true   # Completely isolated
    # Only accessible by services in this network

  monitoring:
    driver: bridge
    internal: false
    # Monitoring access
```

**Network configuration options:**
```yaml
networks:
  # Bridge network (default)
  app_network:
    driver: bridge
    driver_opts:
      com.docker.network.bridge.name: my_bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1

  # Overlay network (for Swarm)
  overlay_net:
    driver: overlay
    attachable: true

  # Custom network with labels
  secure_net:
    driver: bridge
    labels:
      - "com.example.environment=production"
      - "com.example.security=high"
```

**Service discovery and DNS:**
```yaml
# Docker automatically provides DNS resolution
services:
  web:
    # Can reach api service as 'api' or 'api:8000'
    environment:
      - API_ENDPOINT=http://api:8000

  api:
    # Can reach database as 'db' or 'db:5432'
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
```

**Network security:**
```bash
# Create secure networks
docker network create --driver bridge --internal secure_net
docker network create --driver bridge --opt com.docker.network.bridge.name=my_bridge app_net

# Inspect networks
docker network ls
docker network inspect app_net

# Connect containers to networks
docker network connect secure_net my_container
docker network disconnect bridge my_container
```

**Advanced networking patterns:**
```yaml
version: '3.8'

services:
  # Service mesh with Traefik
  traefik:
    image: traefik:v2.9
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
    ports:
      - "80:80"
      - "8080:8080"  # Traefik dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    networks:
      - proxy

  web:
    image: myapp/web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`myapp.local`)"
      - "traefik.http.services.web.loadbalancer.server.port=8000"
      - "traefik.http.routers.web.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=test:$$2y$$10$$..."  # Hashed password
    networks:
      - app
    depends_on:
      - api

  api:
    image: myapp/api
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.myapp.local`)"
      - "traefik.http.services.api.loadbalancer.server.port=8000"
    networks:
      - app
    depends_on:
      - db

networks:
  proxy:
    driver: bridge
  app:
    driver: bridge
    internal: true
```

**Network troubleshooting:**
```bash
# Check container networking
docker inspect my_container | jq '.NetworkSettings.Networks'

# Test connectivity between containers
docker exec web ping api
docker exec api nslookup db

# Network debugging
docker network ls
docker network inspect bridge

# Check port mapping
docker port my_container

# Monitor network traffic
docker stats
docker exec web netstat -tuln
```

**Multi-host networking:**
```yaml
# Docker Swarm networking
version: '3.8'

services:
  web:
    image: myapp/web
    networks:
      - frontend
    deploy:
      replicas: 3
      placement:
        constraints:
          - node.role == worker

  api:
    image: myapp/api
    networks:
      - frontend
      - backend
    deploy:
      replicas: 2

  db:
    image: postgres
    networks:
      - backend
    volumes:
      - db_data:/var/lib/postgresql/data
    deploy:
      placement:
        constraints:
          - node.role == manager

networks:
  frontend:
    driver: overlay
  backend:
    driver: overlay
    internal: true

volumes:
  db_data:
```

**Common mistakes:**
- Using default bridge network for everything
- Not isolating sensitive services
- Exposing unnecessary ports externally
- Missing health checks for service dependencies
- Not configuring proper DNS resolution

**When to apply:**
- Multi-service application architecture
- Microservices communication
- Security isolation requirements
- Service discovery implementation
- Network troubleshooting and monitoring