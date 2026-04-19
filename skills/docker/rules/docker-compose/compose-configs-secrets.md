---
title: Docker Compose Configs and Secrets
impact: HIGH
impactDescription: Enables secure configuration management and sensitive data handling in multi-container applications
tags: docker, compose, configs, secrets, security
---

## Docker Compose Configs and Secrets

**Problem:**
Applications require configuration data and sensitive information like API keys, database credentials, and certificates. Improper handling exposes secrets in images, environment variables, or version control. Configs and secrets management is essential for security and maintainability.

**Solution:**
Implement Docker Compose configs and secrets for secure, runtime configuration management separate from application code and images.

## ✅ Correct: Configs and secrets implementation

### 1. Configs for non-sensitive configuration
```yaml
# docker-compose.yml
version: '3.8'

configs:
  nginx_config:
    file: ./nginx/nginx.conf
  app_config:
    file: ./config/app.yaml

services:
  nginx:
    image: nginx:alpine
    configs:
      - source: nginx_config
        target: /etc/nginx/nginx.conf
    ports:
      - "80:80"

  app:
    image: myapp:latest
    configs:
      - source: app_config
        target: /app/config.yaml
    environment:
      - CONFIG_FILE=/app/config.yaml
```

### 2. Secrets for sensitive data
```yaml
# docker-compose.yml
version: '3.8'

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    environment: "API_KEY"
  tls_cert:
    file: ./secrets/cert.pem

services:
  db:
    image: postgres:15
    secrets:
      - source: db_password
        target: db_password
    environment:
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password

  api:
    image: myapi:latest
    secrets:
      - source: api_key
        target: api_key
    environment:
      - API_KEY_FILE=/run/secrets/api_key

  web:
    image: nginx:alpine
    secrets:
      - source: tls_cert
        target: /etc/ssl/certs/cert.pem
    ports:
      - "443:443"
```

### 3. External secrets from Docker secrets
```yaml
# docker-compose.yml
version: '3.8'

secrets:
  my_secret:
    external: true
    name: my_docker_secret

services:
  app:
    image: myapp:latest
    secrets:
      - source: my_secret
        target: app_secret
```

### 4. Runtime secrets with environment variables
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    secrets:
      - source: app_key
        target: /run/secrets/app_key
    environment:
      - APP_KEY_FILE=/run/secrets/app_key
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  app_key:
    environment: "APP_KEY"  # From environment variable
  db_password:
    file: ./secrets/db_password.txt
```

### 5. Config interpolation with secrets
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp:latest
    environment:
      - DATABASE_URL=postgresql://user:${DB_PASSWORD}@db:5432/mydb
    secrets:
      - source: db_password
        target: db_password

secrets:
  db_password:
    environment: "DB_PASSWORD"
```

## ❌ Incorrect: Insecure configuration practices

```yaml
# ❌ Hardcoded secrets in compose file
services:
  db:
    image: postgres
    environment:
      - POSTGRES_PASSWORD=mysecretpassword  # Exposed in file

  app:
    image: myapp
    environment:
      - API_KEY=sk-1234567890abcdef  # Exposed in version control
```

```yaml
# ❌ Secrets in environment files without proper mounting
services:
  app:
    image: myapp
    env_file:
      - secrets.env  # File committed to git
```

## Key Benefits
- **Security isolation**: Secrets not embedded in images or compose files
- **Runtime configuration**: Config changes without rebuilding
- **Environment flexibility**: Different configs for dev/staging/prod
- **Access control**: Granular permission management
- **Audit trails**: Track secret usage and access
- **Compliance**: Meet security standards for sensitive data</content>
<parameter name="filePath">skills/docker-skill/rules/docker-compose/compose-configs-secrets.md