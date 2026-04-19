# Docker Swarm Setup and Management
**Impact:** HIGH - Enables cluster orchestration for scalable, highly available container deployments

**Problem:**
Single Docker hosts cannot provide high availability, load balancing, or scaling capabilities. Applications require clustering for production reliability. Docker Swarm provides native clustering without external orchestration tools.

**Solution:**
Implement Docker Swarm for cluster management, service discovery, load balancing, and rolling updates across multiple Docker hosts.

## ✅ Correct: Swarm cluster setup and management

### 1. Initialize Swarm cluster
```bash
# Initialize Swarm on manager node
docker swarm init --advertise-addr <MANAGER-IP>

# Get join token for worker nodes
docker swarm join-token worker

# Get join token for manager nodes
docker swarm join-token manager

# Join worker nodes to cluster
docker swarm join --token <WORKER-TOKEN> <MANAGER-IP>:2377

# List cluster nodes
docker node ls
```

### 2. Multi-manager high availability
```bash
# Initialize with multiple managers for HA
docker swarm init --advertise-addr <MANAGER1-IP>

# Join additional managers
docker swarm join --token <MANAGER-TOKEN> <MANAGER1-IP>:2377

# Promote worker to manager
docker node promote <NODE-ID>

# Demote manager to worker
docker node demote <NODE-ID>
```

### 3. Cluster configuration and labels
```bash
# Add labels to nodes for scheduling
docker node update --label-add region=us-west <NODE-ID>
docker node update --label-add type=storage <NODE-ID>
docker node update --label-add gpu=true <NODE-ID>

# Update node availability
docker node update --availability drain <NODE-ID>  # For maintenance
docker node update --availability active <NODE-ID>  # Bring back online

# View node details
docker node inspect <NODE-ID>
docker node ps <NODE-ID>  # Services running on node
```

### 4. Swarm network security
```bash
# Create encrypted overlay network
docker network create --driver overlay --opt encrypted myapp_net

# Create network with custom subnets
docker network create --driver overlay \
  --subnet 10.0.9.0/24 \
  --gateway 10.0.9.1 \
  myapp_net

# Inspect network
docker network inspect myapp_net
```

### 5. Cluster monitoring and maintenance
```bash
# View cluster status
docker info
docker system df  # Disk usage

# Clean up unused resources
docker system prune
docker system prune --volumes

# Rotate certificates (auto-rotated, but manual option)
docker swarm ca --rotate

# Backup Swarm state
docker swarm ca --ca-cert ./ca.pem --ca-key ./ca-key.pem

# Update Swarm
docker swarm update --autolock  # Enable manager lock
```

### 6. Swarm configuration management
```bash
# Create configs
echo "nginx config content" | docker config create nginx.conf -

# Create secrets
echo "database password" | docker secret create db_password -

# List resources
docker config ls
docker secret ls
```

### 7. Resource management and constraints
```bash
# Set node resource limits
docker node update --label-add memory=8GB <NODE-ID>
docker node update --label-add cpu=4 <NODE-ID>

# Service placement constraints
docker service create \
  --name web \
  --constraint 'node.labels.region == us-west' \
  --constraint 'node.labels.type != storage' \
  nginx
```

## ❌ Incorrect: Swarm antipatterns

```bash
# ❌ Single manager (no HA)
docker swarm init  # Only one manager

# ❌ No network encryption
docker network create --driver overlay myapp_net  # Unencrypted

# ❌ No node labels for scheduling
docker service create --name web nginx  # Random placement

# ❌ No resource constraints
# Services can consume all node resources
```

## Key Benefits
- **High availability**: Multiple managers prevent single points of failure
- **Load balancing**: Built-in service load balancing
- **Scaling**: Horizontal scaling with rolling updates
- **Security**: Encrypted networks and secret management
- **Scheduling**: Intelligent service placement
- **Self-healing**: Automatic service recovery</content>
<parameter name="filePath">skills/docker-skill/rules/swarm/swarm-setup.md