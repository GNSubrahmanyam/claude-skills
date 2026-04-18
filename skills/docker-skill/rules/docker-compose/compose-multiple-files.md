# Docker Compose Multiple Files
**Impact:** HIGH - Enables modular, maintainable, and environment-specific compose configurations

**Problem:**
Complex applications require different configurations for development, testing, and production. Single large compose files become unmaintainable. Teams need to share common services while customizing per environment. Without proper file organization, configurations become duplicated and error-prone.

**Solution:**
Implement multiple compose files with merge, include, profiles, and overrides for modular, environment-specific configurations.

## ✅ Correct: Multiple compose files implementation

### 1. Base compose file with common services
```yaml
# docker-compose.yml (base configuration)
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  db_data:
  redis_data:
```

### 2. Development overrides
```yaml
# docker-compose.override.yml (development)
version: '3.8'

services:
  db:
    ports:
      - "5432:5432"  # Expose for local development
    environment:
      - POSTGRES_PASSWORD=dev_password

  redis:
    ports:
      - "6379:6379"

  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/__pycache__
    ports:
      - "8000:8000"
    environment:
      - DEBUG=1
      - DATABASE_URL=postgresql://postgres:dev_password@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: python manage.py runserver 0.0.0.0:8000
```

### 3. Production overrides
```yaml
# docker-compose.prod.yml (production)
version: '3.8'

services:
  db:
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  redis:
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    deploy:
      resources:
        limits:
          memory: 512M

  app:
    image: myapp:latest
    environment:
      - DATABASE_URL=postgresql://postgres@db:5432/myapp
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
    secrets:
      - db_password
    depends_on:
      - db
      - redis
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

secrets:
  db_password:
    external: true
```

### 4. Using profiles for optional services
```yaml
# docker-compose.yml with profiles
version: '3.8'

services:
  app:
    image: myapp:latest

  db:
    image: postgres:15

  # Development-only services
  pgadmin:
    image: dpage/pgadmin4
    profiles: ["dev"]
    ports:
      - "5050:80"

  # Testing services
  test-runner:
    image: myapp:test
    profiles: ["test"]
    command: pytest

  # Monitoring stack
  prometheus:
    image: prom/prometheus
    profiles: ["monitoring"]
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    profiles: ["monitoring"]
    depends_on:
      - prometheus
```

### 5. Using include for modular compose files
```yaml
# docker-compose.yml
version: '3.8'

include:
  - path: ./services/database.yml
  - path: ./services/cache.yml
  - path: ./services/monitoring.yml
    env_file: ./envs/monitoring.env

services:
  app:
    build: .
    depends_on:
      - db
      - redis
```

```yaml
# services/database.yml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

### 6. Environment-specific includes
```yaml
# docker-compose.yml
version: '3.8'

include:
  - path: ./services/${ENVIRONMENT:-dev}.yml

services:
  app:
    image: myapp:${TAG:-latest}
```

### 7. CLI usage with multiple files
```bash
# Development (automatic override)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up

# With profiles
docker compose --profile monitoring up

# Config validation
docker compose -f docker-compose.yml -f docker-compose.prod.yml config

# List services
docker compose ps
```

## ❌ Incorrect: Monolithic compose files

```yaml
# ❌ Single huge file with everything
version: '3.8'

services:
  # 50+ services all in one file
  db-dev:
  db-prod:
  redis-dev:
  redis-prod:
  app-dev:
  app-prod:
  monitoring-dev:
  monitoring-prod:
  # ... hundreds of lines
```

## Key Benefits
- **Modularity**: Separate concerns into focused files
- **Environment flexibility**: Different configs per environment
- **Team collaboration**: Independent service management
- **Optional services**: Profiles for conditional services
- **Reusability**: Include common configurations
- **Maintainability**: Smaller, focused files</content>
<parameter name="filePath">skills/docker-skill/rules/docker-compose/compose-multiple-files.md