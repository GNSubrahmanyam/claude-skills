# Image Management (CRITICAL)

**Impact:** CRITICAL - Ensures reliable container deployments and rollback capabilities

**Problem:**
Poor image tagging and registry management leads to deployment confusion, security vulnerabilities from outdated images, and inability to rollback when issues occur.

**Solution:**
Implement proper image tagging strategies, registry management, and lifecycle policies for reliable container deployments.

❌ **Wrong: Poor image management**
```bash
# No versioning, hard to track
docker build -t myapp .
docker tag myapp myapp:latest
docker push myapp:latest
```

✅ **Correct: Image management best practices**
```bash
# Semantic versioning with multiple tags
VERSION="1.2.3"
GIT_COMMIT=$(git rev-parse HEAD)
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# Build with comprehensive labels
docker build \
  --label "org.opencontainers.image.version=${VERSION}" \
  --label "org.opencontainers.image.revision=${GIT_COMMIT}" \
  --label "org.opencontainers.image.created=${BUILD_DATE}" \
  --label "org.opencontainers.image.source=https://github.com/company/myapp" \
  -t myapp:${VERSION} \
  -t myapp:latest \
  -t myregistry.com/myapp:${VERSION} \
  -t myregistry.com/myapp:latest \
  .

# Tag with environment-specific tags
docker tag myapp:${VERSION} myregistry.com/myapp:staging
docker tag myapp:${VERSION} myregistry.com/myapp:production

# Push all tags
docker push myregistry.com/myapp:${VERSION}
docker push myregistry.com/myapp:latest
docker push myregistry.com/myapp:staging
docker push myregistry.com/myapp:production

# List and verify images
docker images myregistry.com/myapp
```

**Tagging strategies:**
- **Semantic versioning**: `1.2.3` for releases
- **Latest tag**: `latest` for convenience (use cautiously)
- **Git-based**: `git-abc1234` for development builds
- **Environment-specific**: `staging`, `production`
- **Feature branches**: `feature/user-auth`
- **Date-based**: `2024-01-15` for nightly builds

**Registry management:**
```bash
# Login to registry
docker login myregistry.com

# List repositories
docker search myregistry.com/myapp

# Inspect image details
docker inspect myregistry.com/myapp:1.2.3

# Clean up old images
docker system prune -f
docker image prune -f

# Registry cleanup (if supported)
# Remove old tags programmatically
```

**Security considerations:**
```bash
# Scan images for vulnerabilities
docker scan myregistry.com/myapp:1.2.3

# Sign images (if using Docker Content Trust)
export DOCKER_CONTENT_TRUST=1
docker push myregistry.com/myapp:1.2.3

# Verify image signatures
docker trust inspect myregistry.com/myapp:1.2.3
```

**CI/CD integration:**
```yaml
# .github/workflows/docker.yml
name: Build and Push Docker Image

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2

    - name: Login to Registry
      uses: docker/login-action@v2
      with:
        registry: myregistry.com
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: myregistry.com/myapp
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}

    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        platforms: linux/amd64,linux/arm64
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

**Image lifecycle management:**
```bash
# List all images with size
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

# Remove dangling images
docker image prune -f

# Remove images older than 30 days
docker image ls --format "{{.Repository}}:{{.Tag}}" | \
  xargs -I {} docker inspect {} --format='{{.RepoTags}} {{.Created}}' | \
  awk '$2 <= "'$(date -d '30 days ago' +%Y-%m-%d)"' | \
  cut -d' ' -f1 | xargs docker rmi 2>/dev/null || true

# Registry cleanup script
#!/bin/bash
REPO="myregistry.com/myapp"
KEEP_TAGS=("latest" "staging" "production")

# Get all tags
TAGS=$(curl -s "https://${REPO}/v2/${REPO}/tags/list" | jq -r '.tags[]')

for tag in $TAGS; do
  if [[ ! " ${KEEP_TAGS[@]} " =~ " ${tag} " ]]; then
    echo "Would delete: ${tag}"
    # curl -X DELETE "https://${REPO}/v2/${REPO}/manifests/${digest}"
  fi
done
```

**Common mistakes:**
- Using `latest` tag in production
- Not tagging with semantic versions
- Pushing without scanning for vulnerabilities
- Not implementing rollback strategies
- Mixing development and production images

**When to apply:**
- All container build processes
- CI/CD pipeline implementation
- Production deployment strategies
- Multi-environment management
- Security compliance requirements