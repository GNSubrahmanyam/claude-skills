---
title: Docker Compose Advanced CLI
impact: HIGH
impactDescription: Enables efficient project management, debugging, and advanced compose operations
tags: docker, compose, cli, debugging, automation
---

## Docker Compose Advanced CLI

**Problem:**
Basic docker compose up/down commands are insufficient for complex workflows. Teams need advanced CLI features for debugging, project isolation, service management, and automation. Without proper CLI usage, development and deployment processes become inefficient and error-prone.

**Solution:**
Master advanced Docker Compose CLI commands for project management, service control, debugging, and automation workflows.

## ✅ Correct: Advanced CLI usage

### 1. Project management and isolation
```bash
# Specify project name for isolation
docker compose -p myproject up

# Multiple projects on same host
docker compose -p frontend up
docker compose -p backend up
docker compose -p database up

# List all projects
docker compose ls

# Stop all projects
docker compose -p frontend down
docker compose -p backend down
```

### 2. Service lifecycle management
```bash
# Start specific services
docker compose up web db

# Start in detached mode
docker compose up -d

# Scale services
docker compose up -d --scale web=3

# Restart services
docker compose restart web

# Stop and remove
docker compose down

# Stop without removing
docker compose stop

# Force stop
docker compose kill web
```

### 3. Build and rebuild operations
```bash
# Build all services
docker compose build

# Build specific service
docker compose build web

# Build without cache
docker compose build --no-cache

# Build and start
docker compose up --build

# Rebuild and restart
docker compose up --build --force-recreate
```

### 4. Debugging and inspection
```bash
# View service logs
docker compose logs

# Follow logs
docker compose logs -f web

# Logs with timestamps
docker compose logs -t

# Logs for specific services
docker compose logs web db

# View service status
docker compose ps

# Detailed status
docker compose ps --format json

# View running processes
docker compose top

# Execute commands in running containers
docker compose exec web bash

# Execute with privileges
docker compose exec --privileged db psql -U postgres

# Run one-off commands
docker compose run --rm web python manage.py migrate
```

### 5. Configuration management
```bash
# Validate compose file
docker compose config

# View merged configuration
docker compose -f docker-compose.yml -f docker-compose.prod.yml config

# Output in JSON format
docker compose config --format json

# Check for issues
docker compose config --quiet
```

### 6. Volume and network management
```bash
# List volumes
docker volume ls

# Remove unused volumes
docker compose down -v

# List networks
docker network ls

# Remove networks
docker compose down --remove-orphans
```

### 7. Compose watch for development
```yaml
# docker-compose.yml with watch
version: '3.8'

services:
  web:
    build: .
    develop:
      watch:
        - action: sync
          path: ./app
          target: /app
        - action: rebuild
          path: package.json
```

```bash
# Start with watch mode
docker compose watch

# Watch rebuilds automatically on file changes
# No manual rebuilds needed during development
```

### 8. Advanced up options
```bash
# Start with specific profile
docker compose --profile monitoring up

# Start with environment variables
docker compose --env-file .env.prod up

# Start with custom file
docker compose -f docker-compose.yml -f docker-compose.override.yml up

# Start without dependencies
docker compose up --no-deps web

# Start with custom timeout
docker compose up --timeout 60
```

### 9. Service dependency management
```bash
# Wait for dependencies
docker compose up --wait

# Start dependencies only
docker compose up db redis --wait

# Check dependency health
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### 10. Batch operations and automation
```bash
# Parallel operations
docker compose build --parallel

# Dry run
docker compose --dry-run up

# Export configuration
docker compose config > compose-resolved.yml

# Backup volumes
docker compose exec db pg_dump -U postgres mydb > backup.sql
```

## ❌ Incorrect: Basic CLI usage

```bash
# ❌ Manual rebuilds
docker compose down
docker compose build
docker compose up

# ❌ No project isolation
docker compose up  # Conflicts with other projects

# ❌ Poor debugging
docker ps  # Instead of docker compose ps
docker logs container_id  # Instead of docker compose logs service

# ❌ No configuration validation
# Deploying without checking config
```

## Key Benefits
- **Project isolation**: Multiple environments without conflicts
- **Efficient debugging**: Comprehensive logging and inspection
- **Automated workflows**: Watch mode and dependency management
- **Configuration validation**: Prevent deployment issues
- **Resource management**: Proper cleanup and scaling
- **CI/CD integration**: Scriptable operations</content>
<parameter name="filePath">skills/docker-skill/rules/docker-compose/compose-cli-advanced.md