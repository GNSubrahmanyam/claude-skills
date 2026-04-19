# Docker Compose Volumes (HIGH)

**Impact:** HIGH - Ensures data persistence and efficient file sharing between containers

**Problem:**
Containerized applications lose data on restart without proper volume management. Inefficient volume mounting can cause performance issues and security vulnerabilities.

**Solution:**
Implement comprehensive Docker Compose volume strategies for data persistence, sharing, and performance optimization following Docker volume best practices.

❌ **Wrong: Poor volume management**
```yaml
services:
  app:
    volumes:
      - /host/path:/app/data  # Host volume without management
  db:
    volumes:
      - ./data:/var/lib/postgresql/data  # Bind mount without backup
```

✅ **Correct: Comprehensive volume management**
```yaml
version: '3.8'

services:
  # Django application with optimized volumes
  django:
    build: .
    volumes:
      # Source code (development)
      - .:/app
      - /app/__pycache__        # Exclude Python cache
      - /app/*.pyc
      - /app/.pytest_cache
      - /app/staticfiles        # Exclude collected static files
      - /app/media              # Exclude uploaded media (use separate volume)

      # Static files volume (shared with nginx)
      - django_static:/app/staticfiles

      # Media files volume (persistent)
      - django_media:/app/media

      # Logs volume (for log aggregation)
      - django_logs:/app/logs

      # Node modules (if frontend build)
      - /app/node_modules
    environment:
      - DEBUG=1
    depends_on:
      postgres:
        condition: service_healthy

  # FastAPI application
  fastapi:
    build: ./api
    volumes:
      - ./api:/app
      - /app/__pycache__
      - /app/.pytest_cache
      - fastapi_logs:/app/logs
    environment:
      - DEBUG=1

  # PostgreSQL with comprehensive volume setup
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      # Database data (persistent)
      - postgres_data:/var/lib/postgresql/data

      # Initialization scripts
      - ./init-scripts:/docker-entrypoint-initdb.d:ro

      # Custom configuration
      - ./postgres.conf:/etc/postgresql/postgresql.conf:ro

      # Backup volume
      - postgres_backups:/backups

      # WAL archives (for point-in-time recovery)
      - postgres_wal:/var/lib/postgresql/wal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]

  # Redis with optimized volumes
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      # Data persistence
      - redis_data:/data

      # Configuration
      - ./redis.conf:/etc/redis/redis.conf:ro

      # Logs
      - redis_logs:/var/log/redis
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  # Nginx with volume sharing
  nginx:
    image: nginx:alpine
    volumes:
      # Configuration
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro

      # SSL certificates
      - nginx_ssl:/etc/ssl/certs:ro

      # Shared static files from Django
      - django_static:/var/www/static:ro

      # Shared media files
      - django_media:/var/www/media:ro

      # Logs
      - nginx_logs:/var/log/nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - django

  # Backup service
  backup:
    image: postgres:15-alpine
    volumes:
      # Access to database data
      - postgres_data:/var/lib/postgresql/data:ro

      # Backup destination
      - postgres_backups:/backups

      # Shared backup scripts
      - ./backup-scripts:/scripts:ro
    command: ["/scripts/daily-backup.sh"]
    depends_on:
      - postgres
    profiles: ["backup"]

volumes:
  # Application volumes
  django_static:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/django/static

  django_media:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/django/media

  django_logs:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/django/logs

  fastapi_logs:
    driver: local

  # Database volumes
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/postgres/data

  postgres_backups:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/postgres/backups

  postgres_wal:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/postgres/wal

  # Cache volumes
  redis_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/redis/data

  redis_logs:
    driver: local

  # Web server volumes
  nginx_ssl:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/nginx/ssl

  nginx_logs:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./volumes/nginx/logs
```

**Volume driver options:**
```yaml
volumes:
  # Local driver with bind mount
  app_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /host/path/to/data

  # NFS volume
  nfs_data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=192.168.1.100,rw
      device: ":/path/to/nfs/share"

  # tmpfs for temporary data
  temp_data:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs

  # Volume with labels
  labeled_volume:
    driver: local
    labels:
      com.example.environment: production
      com.example.type: database
```

**Volume performance optimization:**
```yaml
services:
  # Database with performance volumes
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data:rw
      - type: tmpfs
        target: /dev/shm
        tmpfs:
          size: 1G  # Shared memory for better performance
    tmpfs:
      - /tmp:postgre  # Temporary files in memory

  # Application with performance considerations
  app:
    volumes:
      # Read-only volumes where possible
      - ./config:/app/config:ro
      # Cached volumes for better performance
      - type: volume
        source: app_cache
        target: /app/cache
        volume:
          nocopy: true
```

**Volume backup and recovery:**
```yaml
# Backup service
services:
  backup:
    image: alpine
    volumes:
      - app_data:/data:ro
      - backups:/backup
    command: >
      sh -c "
        tar czf /backup/backup-$(date +%Y%m%d_%H%M%S).tar.gz -C /data . &&
        find /backup -name 'backup-*.tar.gz' -mtime +7 -delete
      "
    schedules:
      - cron: "0 2 * * *"  # Daily at 2 AM

  # Restore service
  restore:
    image: alpine
    volumes:
      - app_data:/data
      - backups:/backup:ro
    command: >
      sh -c "
        ls /backup/backup-*.tar.gz | head -1 | xargs -I {} tar xzf {} -C /data
      "
    profiles: ["restore"]
```

**Volume security:**
```yaml
services:
  secure_app:
    volumes:
      # Read-only access to sensitive config
      - ./secrets:/app/secrets:ro
      # No access to host filesystem
      - /dev/null:/host-files:Z  # Block host access
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp  # Temporary writable directory
```

**Volume monitoring:**
```bash
# Check volume usage
docker system df -v

# Inspect volume details
docker volume inspect my_volume

# Monitor volume performance
docker run --rm -it \
  --volume my_volume:/data \
  alpine sh -c "time dd if=/dev/zero of=/data/test bs=1M count=100"
```

**Common mistakes:**
- Using bind mounts without proper host path management
- Not excluding cache files from development volumes
- Missing backup strategies for persistent volumes
- Inefficient volume driver selection
- Not monitoring volume performance and usage

**When to apply:**
- Data persistence requirements
- File sharing between containers
- Development workflow optimization
- Backup and recovery strategies
- Performance optimization