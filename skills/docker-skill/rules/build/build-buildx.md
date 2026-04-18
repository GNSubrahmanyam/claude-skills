# Buildx Advanced Builds
**Impact:** CRITICAL - Enables efficient, scalable, and feature-rich container builds using BuildKit

**Problem:**
Default Docker builds lack advanced features for complex scenarios, leading to slow builds, limited caching, and inability to handle multi-platform or distributed builds. Teams struggle with build consistency, performance, and deployment across different environments.

**Solution:**
Implement Buildx for advanced build capabilities including custom builders, Bake for build orchestration, and integration with BuildKit for optimized builds.

## ✅ Correct: Buildx setup and usage

### 1. Install and configure Buildx
```bash
# Buildx is included with Docker Desktop and Docker Engine
docker buildx version

# Create a new builder instance
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

# List available builders
docker buildx ls
```

### 2. Use Buildx for builds
```bash
# Basic build with Buildx (same as docker build but with BuildKit)
docker buildx build -t myapp:latest .

# Build with multiple tags
docker buildx build -t myapp:v1.0 -t myapp:latest .

# Build and load into local daemon
docker buildx build --load -t myapp:latest .

# Build and push to registry
docker buildx build --push -t registry.example.com/myapp:latest .
```

### 3. Bake for multi-target builds
Create `docker-bake.hcl`:
```hcl
group "default" {
  targets = ["app", "test"]
}

target "app" {
  context = "."
  dockerfile = "Dockerfile"
  tags = ["myapp:latest"]
}

target "test" {
  context = "."
  dockerfile = "Dockerfile.test"
  target = "test"
  output = ["type=cacheonly"]
}

target "lint" {
  context = "."
  dockerfile = "Dockerfile.lint"
  target = "lint"
  output = ["type=cacheonly"]
}
```

Run Bake builds:
```bash
# Build all default targets
docker buildx bake

# Build specific target
docker buildx bake app

# Build with custom file
docker buildx bake -f docker-bake.hcl
```

### 4. Custom builder management
```bash
# Create builder with custom configuration
docker buildx create \
  --name remote-builder \
  --driver remote \
  --driver-opt url=tcp://buildkitd.example.com:1234

# Use remote builder
docker buildx use remote-builder

# Inspect builder
docker buildx inspect remote-builder

# Remove builder
docker buildx rm mybuilder
```

### 5. Build with annotations
```bash
docker buildx build \
  --annotation "org.opencontainers.image.title=My App" \
  --annotation "org.opencontainers.image.description=Description" \
  --annotation "org.opencontainers.image.source=https://github.com/user/repo" \
  --push \
  -t myapp:latest .
```

## ❌ Incorrect: Legacy build usage

```bash
# Avoid using legacy builder
DOCKER_BUILDKIT=0 docker build -t myapp:latest .

# Avoid manual multi-target builds
docker build -f Dockerfile.test -t test:latest .
docker build -f Dockerfile.lint -t lint:latest .
# No coordination between builds
```

## Key Benefits
- **Parallel builds**: Build multiple targets simultaneously
- **Remote builders**: Distribute builds across machines
- **Bake orchestration**: Manage complex build pipelines
- **Advanced caching**: Efficient layer reuse and cache mounts
- **Multi-platform support**: Build for multiple architectures
- **Attestations**: Generate SBOM and provenance metadata</content>
<parameter name="filePath">skills/docker-skill/rules/build/build-buildx.md