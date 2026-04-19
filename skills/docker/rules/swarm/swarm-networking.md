---
title: Docker Swarm Networking
impact: HIGH
impactDescription: Enables secure, scalable inter-service communication in Swarm clusters
tags: docker, swarm, networking, overlay, security
---

## Docker Swarm Networking

**Problem:**
Multi-service applications require secure communication between containers across different nodes. Default networking doesn't provide encryption, service discovery, or load balancing. Swarm networking provides overlay networks with built-in security and service mesh capabilities.

**Solution:**
Implement Swarm overlay networking for encrypted inter-service communication, service discovery, and load balancing across the cluster.

## ✅ Correct: Swarm overlay networking

### 1. Create overlay networks
```bash
# Create encrypted overlay network
docker network create --driver overlay --opt encrypted myapp_net

# Create network with custom options
docker network create --driver overlay \
  --subnet 10.0.9.0/24 \
  --gateway 10.0.9.1 \
  --opt encrypted \
  myapp_net

# Attachable network (for standalone containers)
docker network create --driver overlay \
  --attachable \
  --opt encrypted \
  myapp_net
```

### 2. Service networking in Swarm
```bash
# Create services on overlay network
docker service create --name web \
  --network myapp_net \
  --replicas 3 \
  nginx:alpine

docker service create --name api \
  --network myapp_net \
  --network ingress \
  myapi:latest

# Inspect network
docker network inspect myapp_net
```

### 3. Ingress network and routing mesh
```bash
# Services automatically join ingress network for external access
docker service create --name web \
  --publish published=80,target=80 \
  --replicas 3 \
  nginx:alpine

# Routing mesh provides load balancing across all nodes
# External traffic to any node on port 80 routes to web service
```

### 4. Network security and isolation
```bash
# Create isolated network for sensitive services
docker network create --driver overlay \
  --opt encrypted \
  --internal \
  secure_net

# Create network with custom encryption
docker network create --driver overlay \
  --opt encrypted=true \
  --opt encryption=key-rotation=168h \
  secure_net
```

### 5. Service discovery and DNS
```bash
# Automatic service discovery by service name
docker service create --name db \
  --network myapp_net \
  postgres:15

docker service create --name api \
  --network myapp_net \
  --env DATABASE_URL=postgres://db:5432/myapp \
  myapi:latest

# DNS resolution works across all nodes
# api service can reach db service at "db:5432"
```

### 6. Network troubleshooting
```bash
# Inspect network connectivity
docker network inspect myapp_net

# Check service endpoints
docker service inspect api --format "{{.Endpoint}}"

# View network drivers
docker network ls --filter driver=overlay

# Debug network connectivity
docker service ps api
docker exec -it <container-id> ping db
```

### 7. Advanced networking with Docker Compose
```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - public
      - app
    deploy:
      replicas: 3

  api:
    image: myapi:latest
    networks:
      - app
      - database
    deploy:
      replicas: 2

  db:
    image: postgres:15
    networks:
      - database
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    deploy:
      placement:
        constraints:
          - node.role == manager

  cache:
    image: redis:7-alpine
    networks:
      - app
    command: redis-server --appendonly yes
    deploy:
      replicas: 1

networks:
  public:
    # Default ingress network for external access
    driver: overlay
  app:
    driver: overlay
    # Encrypted by default in Swarm
  database:
    driver: overlay
    internal: true  # No external access

secrets:
  db_password:
    external: true
```

### 8. Network performance optimization
```bash
# Use VIP mode for better performance (default)
docker service create --name web \
  --endpoint-mode vip \
  --network myapp_net \
  nginx:alpine

# Use DNSRR for direct access (lower latency)
docker service create --name cache \
  --endpoint-mode dnsrr \
  --network myapp_net \
  redis:alpine
```

### 9. Network policies and security
```bash
# Create network with labels for policy enforcement
docker network create --driver overlay \
  --label security=high \
  --opt encrypted \
  secure_net

# Network segmentation by environment
docker network create --driver overlay --label env=prod prod_net
docker network create --driver overlay --label env=staging staging_net
```

## ❌ Incorrect: Networking antipatterns

```bash
# ❌ Using host networking (no isolation)
docker service create --name web \
  --network host \
  nginx:alpine

# ❌ No network encryption
docker network create --driver overlay myapp_net  # Unencrypted traffic

# ❌ Single network for all services
docker service create --name db --network myapp_net postgres
docker service create --name web --network myapp_net nginx  # No isolation

# ❌ Using bridge networks in Swarm
docker network create --driver bridge local_net  # Not for cross-node communication
```

## Key Benefits
- **Encrypted communication**: Built-in IPSec encryption
- **Service mesh**: Automatic load balancing and service discovery
- **Cross-node communication**: Overlay networks span the cluster
- **Network isolation**: Separate networks for different service tiers
- **Routing mesh**: External access through any node
- **DNS-based discovery**: Automatic service name resolution</content>
<parameter name="filePath">skills/docker-skill/rules/swarm/swarm-networking.md