# Docker Swarm Services
**Impact:** HIGH - Enables reliable service deployment, scaling, and updates in Swarm clusters

**Problem:**
Deploying applications across multiple nodes requires coordination, load balancing, and update management. Manual container management doesn't scale. Swarm services provide declarative service management with built-in orchestration.

**Solution:**
Implement Swarm services for declarative application deployment, automatic scaling, rolling updates, and health management across the cluster.

## ✅ Correct: Swarm service deployment and management

### 1. Create and manage services
```bash
# Create a simple service
docker service create --name web nginx:alpine

# Create service with replicas
docker service create --name web --replicas 3 nginx:alpine

# Create service with ports
docker service create --name web \
  --replicas 3 \
  --publish published=80,target=80 \
  nginx:alpine

# Create service with environment variables
docker service create --name api \
  --env DATABASE_URL=postgres://db:5432/myapp \
  --env REDIS_URL=redis://cache:6379 \
  myapi:latest
```

### 2. Service scaling and updates
```bash
# Scale service up
docker service scale web=5

# Scale service down
docker service scale web=2

# Rolling update with zero downtime
docker service update --image nginx:1.25 web

# Update with custom update parameters
docker service update \
  --update-parallelism 2 \
  --update-delay 10s \
  --update-failure-action rollback \
  --image myapp:v2.0 \
  web

# Rollback failed update
docker service rollback web
```

### 3. Service configuration with Docker Compose
```yaml
# docker-compose.yml for Swarm
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
      update_config:
        parallelism: 1
        delay: 10s
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  api:
    image: myapi:latest
    environment:
      - DATABASE_URL=postgres://db:5432/myapp
    deploy:
      replicas: 2
      depends_on:
        - db
    networks:
      - app_network

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - db_data:/var/lib/postgresql/data
    deploy:
      placement:
        constraints:
          - node.role == manager
    networks:
      - app_network

networks:
  app_network:
    driver: overlay

volumes:
  db_data:

secrets:
  db_password:
    external: true
```

### 4. Deploy with Docker Compose
```bash
# Deploy stack to Swarm
docker stack deploy -c docker-compose.yml myapp

# List stacks
docker stack ls

# List services in stack
docker stack services myapp

# Update stack
docker stack deploy -c docker-compose.yml myapp

# Remove stack
docker stack rm myapp
```

### 5. Service health monitoring
```bash
# Create service with health checks
docker service create --name web \
  --health-cmd "curl -f http://localhost/ || exit 1" \
  --health-interval 30s \
  --health-timeout 10s \
  --health-retries 3 \
  nginx:alpine

# Inspect service
docker service inspect web

# View service logs
docker service logs web

# Monitor service tasks
docker service ps web
```

### 6. Advanced service features
```bash
# Global service (one instance per node)
docker service create --name monitoring \
  --mode global \
  --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
  docker/ucp-agent:latest

# Service with custom networks
docker service create --name web \
  --network myapp_net \
  --network ingress \
  nginx:alpine

# Service with secrets and configs
docker service create --name api \
  --secret source=mysecret,target=/app/secret \
  --config source=myconfig,target=/app/config.json \
  myapi:latest
```

### 7. Service discovery and DNS
```bash
# Services automatically discover each other by name
docker service create --name db postgres:15
docker service create --name web \
  --env DATABASE_URL=postgres://db:5432/myapp \
  nginx:alpine

# VIP vs DNSRR modes
docker service create --name web \
  --endpoint-mode vip \  # Default: virtual IP
  nginx:alpine

docker service create --name cache \
  --endpoint-mode dnsrr \  # DNS round-robin
  redis:alpine
```

## ❌ Incorrect: Service deployment antipatterns

```bash
# ❌ Manual container management
docker run -d nginx  # No orchestration

# ❌ No health checks
docker service create --name web nginx  # No monitoring

# ❌ No resource limits
docker service create --name memory-hog myapp  # Can consume all resources

# ❌ Single replica services
docker service create --name critical-app myapp  # No HA
```

## Key Benefits
- **Declarative deployment**: Define desired state, Swarm maintains it
- **Auto-scaling**: Scale services up/down instantly
- **Rolling updates**: Zero-downtime deployments
- **Load balancing**: Built-in service load balancing
- **Self-healing**: Automatic container recovery
- **Resource management**: CPU/memory limits and reservations</content>
<parameter name="filePath">skills/docker-skill/rules/swarm/swarm-services.md