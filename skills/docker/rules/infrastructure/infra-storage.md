---
title: Docker Storage Management
impact: MEDIUM
impactDescription: Ensures persistent data management and backup strategies for containerized applications
tags: docker, storage, persistence, backup, data-lifecycle
---

## Docker Storage Management

**Problem:**
Container storage is ephemeral by default, leading to data loss on container restarts. Applications require persistent storage, backup strategies, and data lifecycle management for production reliability.

**Solution:**
Implement comprehensive storage management with persistent volumes, backup strategies, and data lifecycle management for containerized applications.

## ✅ Correct: Storage management implementation

### 1. Volume Types and Strategies
```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    volumes:
      # Named volumes (managed by Docker)
      - app_data:/app/data
      - app_logs:/app/logs

      # Bind mounts (host directories)
      - ./config:/app/config:ro
      - /host/data:/app/host-data

      # tmpfs (in-memory, fast but volatile)
      - type: tmpfs
        target: /app/cache
        tmpfs:
          size: 100m

volumes:
  app_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${APP_DATA_DIR:-./data/app}
  app_logs:
    driver: local
```

### 2. Database Storage Configuration
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - postgres_backups:/backups
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  mysql:
    image: mysql:8
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${MYSQL_DATABASE}
    volumes:
      - mysql_data:/var/lib/mysql
      - mysql_logs:/var/log/mysql
      - ./mysql-conf.d:/etc/mysql/mysql.conf.d:ro
    command: --default-authentication-plugin=mysql_native_password

volumes:
  postgres_data:
    driver: local
    labels:
      backup: daily
  postgres_backups:
  mysql_data:
  mysql_logs:
```

### 3. Storage Drivers and Performance
```bash
# Check available storage drivers
docker info | grep -A 10 "Storage Driver"

# Use overlay2 for better performance
# /etc/docker/daemon.json
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}

# Storage driver status
docker system df -v
```

### 4. Backup and Recovery Strategies
```yaml
version: '3.8'

services:
  # Automated backup service
  backup:
    image: alpine:latest
    volumes:
      - postgres_data:/data:ro
      - backups:/backups
    command: >
      sh -c "
        while true; do
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          tar czf /backups/backup_${TIMESTAMP}.tar.gz -C /data .
          find /backups -name 'backup_*.tar.gz' -mtime +7 -delete
          sleep 86400
        done
      "
    profiles: ["backup"]

  # Restore service
  restore:
    image: alpine:latest
    volumes:
      - postgres_data:/data
      - backups:/backups:ro
    command: >
      sh -c "
        LATEST_BACKUP=$(ls -t /backups/backup_*.tar.gz | head -1)
        if [ -f \"$LATEST_BACKUP\" ]; then
          tar xzf $LATEST_BACKUP -C /data
          echo 'Restore completed'
        else
          echo 'No backup found'
          exit 1
        fi
      "
    profiles: ["restore"]

volumes:
  postgres_data:
  backups:
```

### 5. Multi-Host Storage Solutions
```yaml
# NFS shared storage
volumes:
  shared_data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,rw
      device: ":/mnt/shared"

# GlusterFS distributed storage
volumes:
  gluster_data:
    driver: local
    driver_opts:
      type: glusterfs
      o: volfile-servers=gluster1:gluster2,log-level=WARNING,log-file=/var/log/gluster.log
      device: "gv0"
```

### 6. Storage Security
```yaml
services:
  secure_app:
    image: myapp:latest
    user: appuser:appgroup
    security_opt:
      - no-new-privileges:true
    volumes:
      - type: bind
        source: ./secure-data
        target: /app/data
        read_only: true
        bind:
          selinux: z  # SELinux context
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 100m
          mode: 1777
```

### 7. Storage Monitoring and Alerts
```yaml
services:
  storage_monitor:
    image: alpine:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/lib/docker/volumes:/var/lib/docker/volumes:ro
    command: >
      sh -c "
        while true; do
          # Check volume usage
          df -h /var/lib/docker/volumes | awk 'NR>1 {print $5, $6}' | while read usage mount; do
            usage_percent=$(echo $usage | sed 's/%//')
            if [ $usage_percent -gt 80 ]; then
              echo \"WARNING: Volume $mount is ${usage_percent}% full\"
            fi
          done
          sleep 300
        done
      "
    profiles: ["monitor"]
```

### 8. Data Lifecycle Management
```yaml
# Volume with retention policy
volumes:
  logs:
    driver: local
    driver_opts:
      type: tmpfs  # In-memory, auto-cleanup
  temp_data:
    labels:
      retention: 7d  # Custom label for cleanup scripts

# Cleanup script
services:
  cleanup:
    image: alpine:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: >
      sh -c "
        # Remove unused volumes older than 30 days
        docker volume ls -q | xargs docker volume inspect | jq -r '.[] | select(.CreatedAt) | .Name' | while read vol; do
          created=$(docker volume inspect $vol | jq -r '.CreatedAt')
          age_days=$(( ( $(date +%s) - $(date -d \"$created\" +%s) ) / 86400 ))
          if [ $age_days -gt 30 ]; then
            docker volume rm $vol
          fi
        done
      "
    profiles: ["cleanup"]
```

### 9. Cloud Storage Integration
```yaml
# AWS EFS
volumes:
  efs_data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=fs-12345678.efs.us-east-1.amazonaws.com,rw,nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2
      device: ":/"

# Azure File Share
volumes:
  azure_files:
    driver: local
    driver_opts:
      type: cifs
      o: username=azureuser,password=azurepass,vers=3.0
      device: "//storageaccount.file.core.windows.net/share"
```

### 10. Storage Performance Optimization
```bash
# Storage performance tuning
# /etc/docker/daemon.json
{
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.size=20G",
    "overlay2.override_kernel_check=true"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Volume performance
docker volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=100m,uid=1000 \
  fast_volume
```

## Volume Management Best Practices

### ✅ Do's
- **Use named volumes** for persistent data
- **Implement backup strategies** for critical data
- **Monitor storage usage** regularly
- **Use appropriate volume types** for different use cases
- **Implement data lifecycle policies**
- **Secure volume access** with proper permissions
- **Test backup and restore procedures**
- **Use volume labels** for organization

### ❌ Don'ts
- **Don't use bind mounts** for persistent data in production
- **Don't store data in container layers**
- **Don't skip backup testing**
- **Don't ignore storage limits**
- **Don't mix data types** in single volumes
- **Don't forget volume cleanup**
- **Don't use host storage** without proper isolation

## Storage Troubleshooting

```bash
# Volume inspection
docker volume ls
docker volume inspect myvolume

# Check volume usage
docker system df -v

# Find large volumes
docker volume ls -q | xargs docker volume inspect | jq -r '.[] | .Name + " " + (.UsageData.Size // empty | tostring)'

# Check mount points
docker inspect mycontainer | jq '.Mounts'

# Storage driver info
docker info | grep -A 10 "Storage Driver"
```

## When to Apply
- Persistent data storage for stateful applications
- Database data persistence
- Log aggregation and storage
- Configuration file management
- Backup and disaster recovery
- Shared storage across containers
- Performance-critical storage needs
- Compliance data retention requirements</content>
<parameter name="filePath">skills/docker-skill/rules/infrastructure/infra-storage.md