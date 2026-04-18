# Docker Compose Environment Variables
**Impact:** HIGH - Enables dynamic, secure, and environment-specific configuration management

**Problem:**
Hardcoded values in compose files make deployments inflexible and insecure. Different environments (dev, staging, prod) require different configurations. Manual value replacement is error-prone and doesn't scale. Environment variables provide the solution but require proper implementation.

**Solution:**
Implement comprehensive environment variable strategies with interpolation, env files, and secure variable handling for flexible, maintainable compose configurations.

## ✅ Correct: Environment variable implementation

### 1. Environment variable interpolation
```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:${POSTGRES_VERSION:-15}
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

  app:
    image: myapp:${APP_TAG:-latest}
    environment:
      - DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:${DB_PORT:-5432}/${DB_NAME}
      - REDIS_URL=redis://redis:6379
      - DEBUG=${DEBUG:-false}
    ports:
      - "${APP_PORT:-8000}:8000"
    depends_on:
      - db
      - redis

  redis:
    image: redis:${REDIS_VERSION:-7}-alpine
    ports:
      - "${REDIS_PORT:-6379}:6379"

volumes:
  db_data:
```

### 2. Environment files
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    env_file:
      - .env
      - .env.local  # Overrides .env values
    environment:
      - NODE_ENV=production  # Overrides env file
```

```bash
# .env file
DB_NAME=myapp
DB_USER=postgres
DB_PASSWORD=secret_password
DB_PORT=5432

APP_PORT=8000
DEBUG=false

REDIS_VERSION=7
POSTGRES_VERSION=15
```

### 3. Multiple environment files by environment
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    env_file:
      - .env.${ENVIRONMENT:-dev}  # Dynamic env file
      - .env.secrets  # Sensitive values
    environment:
      - ENVIRONMENT=${ENVIRONMENT:-dev}
```

```bash
# .env.dev
DB_PASSWORD=dev_password
DEBUG=true
LOG_LEVEL=DEBUG

# .env.prod
DB_PASSWORD=${DB_PASSWORD}  # From external source
DEBUG=false
LOG_LEVEL=INFO

# .env.secrets (not in version control)
API_KEY=sk-1234567890
DB_PASSWORD=prod_secure_password
```

### 4. Variable expansion and defaults
```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: nginx:${NGINX_VERSION:-alpine}
    ports:
      - "${WEB_PORT:-80}:80"
    environment:
      - WORKER_PROCESSES=${WORKER_PROCESSES:-auto}
      - WORKER_CONNECTIONS=${WORKER_CONNECTIONS:-1024}
    volumes:
      - ${WEB_CONFIG:-./nginx.conf}:/etc/nginx/nginx.conf:ro

  app:
    image: ${REGISTRY:-docker.io}/myapp:${TAG:-latest}
    environment:
      - DATABASE_URL=${DB_SCHEME:-postgresql}://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}
      - CACHE_URL=${CACHE_SCHEME:-redis}://${CACHE_HOST}:${CACHE_PORT:-6379}
```

### 5. Environment-specific service configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    environment:
      - DJANGO_SETTINGS_MODULE=myproject.settings.${ENVIRONMENT:-dev}
    env_file:
      - .env.${ENVIRONMENT:-dev}
    deploy:
      replicas: ${REPLICAS:-1}
      resources:
        limits:
          memory: ${MEMORY_LIMIT:-512M}
          cpus: '${CPU_LIMIT:-0.5}'

  db:
    image: postgres:${POSTGRES_VERSION:-15}
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - ${DB_VOLUME:-db_data}:/var/lib/postgresql/data
```

### 6. CLI environment variable usage
```bash
# Set variables inline
docker compose up -e DB_PASSWORD=secret -e DEBUG=true

# Use .env file
docker compose --env-file .env.prod up

# Override specific values
ENVIRONMENT=prod TAG=v1.2.3 docker compose up

# Check interpolated config
docker compose config
```

### 7. Secure environment variable handling
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    environment:
      # Never expose secrets in compose file
      - API_KEY  # Will be set from environment
      - DB_PASSWORD
    env_file:
      - .env.secrets  # Keep out of version control

  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    # Use secrets for sensitive data
    secrets:
      - db_password
```

## ❌ Incorrect: Environment variable antipatterns

```yaml
# ❌ Hardcoded values
services:
  db:
    environment:
      - POSTGRES_PASSWORD=password123  # Never hardcode!

  app:
    environment:
      - API_KEY=sk-1234567890abcdef  # Exposed in version control
```

```yaml
# ❌ No defaults or validation
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL}  # Will fail if not set
      - PORT=${PORT}  # No default
```

## Key Benefits
- **Environment flexibility**: Different configs per environment
- **Security**: Sensitive values from external sources
- **Maintainability**: Single source of configuration
- **CI/CD integration**: Dynamic value injection
- **Validation**: Required variable checking
- **Documentation**: Clear configuration contracts</content>
<parameter name="filePath">skills/docker-skill/rules/docker-compose/compose-environment.md