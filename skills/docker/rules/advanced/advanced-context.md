---
title: Docker Context Management
impact: LOW
impactDescription: Enables seamless management of multiple Docker environments and deployments
tags: docker, context, environments, remote-hosts
---

## Docker Context Management

**Problem:**
Teams work with multiple Docker environments (local, development, staging, production). Switching between environments manually is error-prone and time-consuming. Docker contexts provide a clean way to manage multiple Docker installations and remote hosts.

**Solution:**
Implement Docker contexts for managing multiple Docker environments, remote hosts, and deployment targets with proper isolation and security.

## ✅ Correct: Docker context management

### 1. Context basics
```bash
# List available contexts
docker context ls

# Show current context
docker context show

# Create new context
docker context create my-context

# Switch context
docker context use my-context

# Remove context
docker context rm my-context
```

### 2. Remote Docker host context
```bash
# Create context for remote Docker host
docker context create remote-host \
  --docker host=tcp://remote-host:2376 \
  --docker tlsverify=true \
  --docker tlscacert=/path/to/ca.pem \
  --docker tlscert=/path/to/cert.pem \
  --docker tlskey=/path/to/key.pem

# Use remote context
docker context use remote-host

# All docker commands now target remote host
docker ps
docker build -t myapp .
docker run myapp
```

### 3. Cloud provider contexts
```bash
# Amazon ECS context
docker context create ecs my-ecs-context

# Azure ACI context
docker context create aci my-aci-context

# Google Cloud Run context
docker context create cloudrun my-cloudrun-context

# Deploy to cloud
docker context use my-ecs-context
docker compose up
```

### 4. Context configuration
```bash
# View context details
docker context inspect my-context

# Update context
docker context update my-context \
  --docker host=tcp://new-host:2376

# Export/import contexts
docker context export my-context > context.tar
docker context import other-context context.tar
```

### 5. Multi-environment workflows
```bash
# Development environment
docker context use dev
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Staging environment
docker context use staging
docker compose -f docker-compose.yml -f docker-compose.staging.yml up

# Production environment
docker context use prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

### 6. Context with buildx
```bash
# Create buildx builder on remote context
docker context use remote-host
docker buildx create --name remote-builder --use

# Build on remote host
docker buildx build --push -t myapp:latest .

# Switch back to local
docker context use default
```

### 7. Context security
```bash
# Use SSH for secure remote access
docker context create ssh-context \
  --docker host=ssh://user@remote-host:22

# With custom SSH key
docker context create ssh-context \
  --docker host=ssh://user@remote-host:22 \
  --docker ssh-identity=/path/to/ssh/key
```

### 8. CI/CD context usage
```yaml
# GitHub Actions example
name: Deploy
on: [push]

jobs:
  deploy:
    steps:
      - uses: docker/setup-buildx-action@v3
      
      - name: Create production context
        run: |
          docker context create prod \
            --docker host=tcp://prod-host:2376 \
            --docker tlsverify=true \
            --docker tlscacert=<(echo "$TLS_CA") \
            --docker tlscert=<(echo "$TLS_CERT") \
            --docker tlskey=<(echo "$TLS_KEY")
      
      - name: Deploy to production
        run: |
          docker context use prod
          docker compose up -d
```

## ❌ Incorrect: Context management antipatterns

```bash
# ❌ Manual environment switching
export DOCKER_HOST=tcp://dev-host:2376
# Then remember to change back

# ❌ Hardcoded host addresses
docker -H tcp://prod-host:2376 ps

# ❌ No context isolation
# All commands target same environment
```

## Key Benefits
- **Environment isolation**: Clean separation between dev/staging/prod
- **Remote management**: Control remote Docker hosts securely
- **Cloud integration**: Direct deployment to cloud platforms
- **Team collaboration**: Shared contexts with proper access control
- **CI/CD integration**: Automated environment switching
- **Security**: TLS and SSH-based secure connections</content>
<parameter name="filePath">skills/docker-skill/rules/advanced/advanced-context.md