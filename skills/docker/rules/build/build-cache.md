---
title: Build Caching
impact: CRITICAL
impactDescription: Accelerates build times and reduces resource consumption through intelligent caching
tags: docker, build, caching, performance, ci-cd
---

## Build Caching

**Problem:**
Container builds are slow and resource-intensive without proper caching. Rebuilding unchanged layers wastes time and compute resources. Teams experience long build times, especially in CI/CD pipelines, leading to slower development cycles and higher costs.

**Solution:**
Implement comprehensive build caching strategies including layer caching, external cache sources, cache mounts, and cache export/import to maximize build performance and efficiency.

## ✅ Correct: Build caching implementation

### 1. Layer caching basics
```dockerfile
FROM python:3.11-slim

# Cache dependencies separately
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code after dependencies
COPY . .

CMD ["python", "app.py"]
```

### 2. External cache sources
```bash
# Import cache from previous build
docker buildx build \
  --cache-from type=local,src=/tmp/.buildx-cache \
  --cache-to type=local,dest=/tmp/.buildx-cache-new,mode=max \
  -t myapp:latest .

# Use registry as cache source
docker buildx build \
  --cache-from type=registry,ref=myregistry.com/myapp:cache \
  --cache-to type=registry,ref=myregistry.com/myapp:cache,mode=max \
  --push \
  -t myregistry.com/myapp:latest .
```

### 3. Inline cache mounts
```dockerfile
FROM golang:1.21-alpine AS builder

# Mount Go module cache
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download

COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    go build -o app .
```

### 4. Cache mounts for package managers
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Cache npm dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .

RUN --mount=type=cache,target=/root/.npm \
    npm run build
```

### 5. Multi-stage build caching
```dockerfile
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app

# Cache Maven dependencies
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
    mvn dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn package -DskipTests

FROM eclipse-temurin:17-jre-alpine

COPY --from=builder /app/target/*.jar app.jar

CMD ["java", "-jar", "app.jar"]
```

### 6. GitHub Actions cache integration
```yaml
name: Build and Push
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: myapp:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### 7. Advanced cache configuration
```bash
# Cache with compression
docker buildx build \
  --cache-to type=local,dest=.build-cache,compression=zstd \
  -t myapp:latest .

# Multi-layer cache strategy
docker buildx build \
  --cache-from type=local,src=/tmp/cache \
  --cache-from type=registry,ref=myregistry.com/cache \
  --cache-to type=local,dest=/tmp/cache,mode=max \
  --cache-to type=registry,ref=myregistry.com/cache,mode=max \
  -t myapp:latest .
```

### 8. Cache invalidation strategies
```dockerfile
FROM python:3.11-slim

# Use build args for cache busting
ARG CACHE_BUST
RUN echo "Cache bust: $CACHE_BUST"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
```

## ❌ Incorrect: Poor caching practices

```dockerfile
FROM python:3.11-slim

# Avoid copying everything first
COPY . .

# Dependencies installed after source code changes
RUN pip install --no-cache-dir -r requirements.txt
```

```bash
# Avoid no cache configuration
docker build --no-cache -t myapp:latest .
```

## Key Benefits
- **Faster builds**: Reuse unchanged layers
- **Cost reduction**: Less compute time in CI/CD
- **Developer productivity**: Quicker iteration cycles
- **Network efficiency**: Smaller context transfers
- **Storage optimization**: Efficient cache storage
- **Cross-build caching**: Share caches between builds</content>
<parameter name="filePath">skills/docker-skill/rules/build/build-cache.md