---
title: Database Containerization
impact: CRITICAL
impactDescription: Ensures reliable database deployment in containerized environments
tags: docker, database, containerization, persistence, security
---

## Database Containerization

**Problem:**
Databases in containers require proper configuration, persistence, initialization, and backup strategies. Incorrect containerization leads to data loss, performance issues, and security vulnerabilities.

**Solution:**
Implement production-ready database containers with proper persistence, security, monitoring, and backup procedures following Docker best practices.

❌ **Wrong: Basic database container**
```yaml
services:
  db:
    image: postgres
    environment:
      POSTGRES_PASSWORD: password
# No persistence, security, or monitoring
```

✅ **Correct: Production database containerization**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: myapp_postgres
    restart: unless-stopped

    # Security configuration
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-myapp_prod}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_INITDB_ARGS: |
        --encoding=UTF-8 \
        --lc-collate=C \
        --lc-ctype=C \
        --data-checksums

    # Persistence and performance
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
      - ./postgres.conf:/etc/postgresql/postgresql.conf:ro
      - postgres_backups:/backups

    # Networking and security
    networks:
      - database_network
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    expose:
      - "5432"

    # Resource limits
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

    # Health checks
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

    # Logging
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"

    # Security
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /var/run/postgresql

  # Database migration service
  postgres-migrate:
    image: postgres:15-alpine
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./migrations:/migrations:ro
      - ./migrate.sh:/migrate.sh:ro
    command: ["/migrate.sh"]
    networks:
      - database_network
    profiles: ["migrate"]

  # Backup service
  postgres-backup:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data:ro
      - postgres_backups:/backups
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    command: >
      sh -c "
        while true; do
          pg_dump -h postgres -U ${POSTGRES_USER} ${POSTGRES_DB} > /backups/backup_$(date +%Y%m%d_%H%M%S).sql
          sleep 86400  # Daily backup
        done
      "
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - database_network
    profiles: ["backup"]

volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${POSTGRES_DATA_DIR:-./data/postgres}
  postgres_backups:
    driver: local

networks:
  database_network:
    driver: bridge
    internal: true
```

**PostgreSQL-specific configuration:**
```ini
# postgres.conf - Production PostgreSQL configuration
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100
tcp_keepalives_idle = 60
tcp_keepalives_interval = 10
tcp_keepalives_count = 3

# Logging
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'
log_duration = on
log_lock_waits = on

# Performance
random_page_cost = 1.1
effective_io_concurrency = 200

# Security
ssl = on
ssl_cert_file = '/etc/ssl/certs/postgresql.crt'
ssl_key_file = '/etc/ssl/private/postgresql.key'
```

**Database initialization:**
```sql
-- init.sql - Database initialization
-- Create application user (if different from admin)
CREATE USER IF NOT EXISTS app_user WITH PASSWORD 'app_password';
GRANT ALL PRIVILEGES ON DATABASE myapp_prod TO app_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_buffercache";

-- Set permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user;
```

**Backup and recovery scripts:**
```bash
#!/bin/bash
# backup.sh - Database backup script
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

echo "Starting PostgreSQL backup..."
pg_dump -h postgres -U $POSTGRES_USER -d $POSTGRES_DB > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "Backup completed: $BACKUP_FILE"

    # Compress backup
    gzip $BACKUP_FILE

    # Clean old backups (keep last 7 days)
    find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

    echo "Backup cleanup completed"
else
    echo "Backup failed!"
    exit 1
fi
```

**Redis containerization:**
```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: myapp_redis
    restart: unless-stopped

    # Security configuration
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --appendonly yes
      --appendfsync everysec
      --auto-aof-rewrite-percentage 100
      --auto-aof-rewrite-min-size 64mb
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --tcp-keepalive 300
      --timeout 0
      --loglevel notice
      --save 900 1
      --save 300 10
      --save 60 10000
      --bind 0.0.0.0
      --protected-mode yes

    # Persistence and configuration
    volumes:
      - redis_data:/data
      - redis_config:/etc/redis
      - ./redis.conf:/etc/redis/redis.conf:ro
      - redis_logs:/var/log/redis

    # Networking
    networks:
      - cache_network
    ports:
      - "${REDIS_PORT:-6379}:6379"
    expose:
      - "6379"

    # Resource limits
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

    # Health checks
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

    # Logging and security
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "5"
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp

  # Redis Insight (Web GUI for Redis)
  redis-insight:
    image: redis/redisinsight:latest
    container_name: redis_insight
    restart: unless-stopped
    ports:
      - "${REDIS_INSIGHT_PORT:-8001}:8001"
    volumes:
      - redis_insight_data:/data
    networks:
      - cache_network
    profiles: ["insight"]

  # Redis Sentinel for High Availability
  redis-sentinel:
    image: redis:7-alpine
    container_name: redis_sentinel
    restart: unless-stopped
    depends_on:
      - redis
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf:ro
      - redis_sentinel_data:/data
    networks:
      - cache_network
    profiles: ["sentinel"]

  # Redis Cluster (3 masters + 3 replicas)
  redis-cluster:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-cluster.conf:/etc/redis/redis.conf:ro
      - redis_cluster_data:/data
    networks:
      cache_network:
        ipv4_address: 172.20.0.10
    profiles: ["cluster"]

  redis-replica-1:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-replica.conf:/etc/redis/redis.conf:ro
      - redis_replica1_data:/data
    networks:
      cache_network:
        ipv4_address: 172.20.0.11
    depends_on:
      - redis-cluster
    profiles: ["cluster"]

  redis-replica-2:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server /etc/redis/redis.conf
    volumes:
      - ./redis-replica.conf:/etc/redis/redis.conf:ro
      - redis_replica2_data:/data
    networks:
      cache_network:
        ipv4_address: 172.20.0.12
    depends_on:
      - redis-cluster
    profiles: ["cluster"]

volumes:
  redis_data:
    driver: local
  redis_config:
  redis_logs:
  redis_insight_data:
  redis_sentinel_data:
  redis_cluster_data:
  redis_replica1_data:
  redis_replica2_data:

networks:
  cache_network:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1
```

**MongoDB containerization:**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7-jammy
    container_name: myapp_mongodb
    restart: unless-stopped

    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
      MONGO_INITDB_DATABASE: ${MONGO_DATABASE}

    volumes:
      - mongodb_data:/data/db
      - ./mongo-init:/docker-entrypoint-initdb.d:ro
      - mongodb_backups:/backups

    networks:
      - database_network
    ports:
      - "${MONGO_PORT:-27017}:27017"

    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'

    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3

    security_opt:
      - no-new-privileges:true

volumes:
  mongodb_data:
  mongodb_backups:

networks:
  database_network:
    driver: bridge
    internal: true
```

**Redis configuration files:**
```ini
# redis.conf - Production Redis configuration
# Network
bind 0.0.0.0
port 6379
tcp-keepalive 300
timeout 0
protected-mode yes

# Security
requirepass your_secure_password_here
# aclfile /etc/redis/acl.conf

# Memory management
maxmemory 512mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence
save 900 1
save 300 10
save 60 10000

appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Logging
loglevel notice
logfile /var/log/redis/redis.log

# Performance
tcp-backlog 511
databases 16
always-show-logo no

# Disable dangerous commands in production
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command SHUTDOWN SHUTDOWN_REDIS
rename-command CONFIG CONFIG_REDIS
```

```ini
# sentinel.conf - Redis Sentinel configuration
sentinel monitor mymaster redis 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
sentinel auth-pass mymaster your_secure_password_here
```

```ini
# redis-cluster.conf - Redis Cluster master configuration
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
```

```ini
# redis-replica.conf - Redis Cluster replica configuration
replicaof redis-cluster 6379
```

**Redis security best practices:**
```bash
# Generate strong password
openssl rand -base64 32

# Use ACLs for fine-grained access control
# acl.conf
user default on >password ~* &* +@all
user readonly on >readonly_password ~* &* +@read
user app on >app_password ~app:* &app:* +@all -@dangerous

# Enable TLS for encrypted connections
# Requires Redis 6.0+
redis-server --tls-port 6380 \
  --port 0 \
  --tls-cert-file /path/to/redis.crt \
  --tls-key-file /path/to/redis.key \
  --tls-ca-cert-file /path/to/ca.crt
```

**Redis monitoring and maintenance:**
```yaml
# Redis monitoring stack
services:
  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      - REDIS_ADDR=redis://redis:6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    ports:
      - "9121:9121"
    depends_on:
      - redis
    networks:
      - monitoring
    profiles: ["monitoring"]

  redis-commander:
    image: rediscommander/redis-commander:latest
    environment:
      - REDIS_HOSTS=local:redis:6379:${REDIS_PASSWORD}
    ports:
      - "8081:8081"
    depends_on:
      - redis
    networks:
      - cache_network
    profiles: ["commander"]
```

**Redis backup and recovery:**
```bash
#!/bin/bash
# redis-backup.sh - Redis backup script
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/redis_backup_${TIMESTAMP}.rdb"

echo "Starting Redis backup..."

# Trigger SAVE command
docker exec myapp_redis redis-cli -a $REDIS_PASSWORD SAVE

# Copy RDB file
docker cp myapp_redis:/data/dump.rdb $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "Backup completed: $BACKUP_FILE"

    # Compress backup
    gzip $BACKUP_FILE

    # Clean old backups (keep last 7 days)
    find $BACKUP_DIR -name "redis_backup_*.rdb.gz" -mtime +7 -delete

    echo "Backup cleanup completed"
else
    echo "Backup failed!"
    exit 1
fi
```

**Redis performance optimization:**
```ini
# Performance tuning
# Increase max connections
maxclients 10000

# Optimize memory
maxmemory-policy volatile-lru
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes

# Connection settings
tcp-backlog 1024
tcp-keepalive 60

# Disable THP (Transparent Huge Pages)
echo never > /sys/kernel/mm/transparent_hugepage/enabled
```

**Redis clustering setup:**
```bash
#!/bin/bash
# create-redis-cluster.sh
# Create Redis cluster with 3 masters and 3 replicas

# Start Redis instances
docker-compose --profile cluster up -d

# Wait for containers to be ready
sleep 10

# Create cluster
docker exec redis-cluster redis-cli --cluster create \
  172.20.0.10:6379 \
  172.20.0.11:6379 \
  172.20.0.12:6379 \
  --cluster-replicas 1

# Check cluster status
docker exec redis-cluster redis-cli cluster nodes
```

**Common database container patterns:**
- **Persistent volumes** for data durability
- **Health checks** for service discovery
- **Resource limits** to prevent resource exhaustion
- **Security hardening** with read-only filesystems
- **Backup strategies** with automated scripts
- **Network isolation** from external access
- **Configuration management** via environment variables

**Database migration strategies:**
```yaml
# Migration service
services:
  migrate:
    image: myapp/migrate:latest
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/myapp
    command: ["alembic", "upgrade", "head"]
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app_network
    profiles: ["migrate"]
```

**Redis troubleshooting:**
```bash
# Common Redis issues and solutions

# Connection refused
docker exec myapp_redis redis-cli ping
# Check if Redis is running and password is correct

# Memory issues
docker exec myapp_redis redis-cli info memory
# Check maxmemory settings and eviction policy

# Persistence problems
docker exec myapp_redis redis-cli info persistence
# Check AOF and RDB status

# Performance monitoring
docker exec myapp_redis redis-cli info stats
docker exec myapp_redis redis-cli info cpu

# Cluster status (if using cluster)
docker exec redis-cluster redis-cli cluster info
docker exec redis-cluster redis-cli cluster nodes
```

**Redis best practices:**
- **Memory management**: Set appropriate maxmemory and eviction policies
- **Persistence strategy**: Choose between RDB, AOF, or both based on requirements
- **Security**: Always use passwords, consider ACLs for fine-grained access
- **Monitoring**: Implement monitoring with Redis Exporter and alerting
- **Backup strategy**: Regular backups with compression and retention policies
- **Connection pooling**: Use connection pooling in applications
- **Key naming**: Use consistent key naming conventions
- **Expiration**: Set appropriate TTL for cached data

**Common mistakes:**
- Not using persistent volumes for data
- Exposing database ports externally in production
- Missing health checks for service dependencies
- Not configuring resource limits
- Ignoring security hardening
- No backup strategies implemented
- Using default Redis configuration in production
- Not monitoring Redis performance metrics
- Ignoring memory limits leading to OOM kills
- Not configuring proper persistence for data durability
- Exposing Redis without password protection

**When to apply:**
- Production database deployments
- Development database environments
- Database migration and seeding
- Backup and recovery procedures
- Multi-database architectures
- Caching layer implementation
- Session storage
- Real-time analytics
- Message queuing (with Redis Streams)
- Rate limiting and API throttling