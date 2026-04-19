---
title: Multi-Platform Builds
impact: CRITICAL
impactDescription: Enables building container images for multiple architectures and operating systems
tags: docker, multi-platform, buildx, architectures, cross-compilation
---

## Multi-Platform Builds

**Problem:**
Applications need to run on diverse hardware (x86, ARM) and operating systems (Linux, Windows). Building separate images for each platform is time-consuming, error-prone, and leads to maintenance overhead. Teams struggle with platform-specific bugs and deployment inconsistencies.

**Solution:**
Implement multi-platform builds using Buildx to create images that run on multiple platforms from a single Dockerfile, with proper emulation and cross-compilation support.

## ✅ Correct: Multi-platform build implementation

### 1. Enable multi-platform builds
```bash
# Check if QEMU is installed for emulation
docker run --privileged --rm tonistiigi/binfmt --install all

# Create a builder that supports multi-platform
docker buildx create --name multi-platform --use
docker buildx inspect --bootstrap
```

### 2. Build for multiple platforms
```bash
# Build for specific platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myapp:latest \
  --push .

# Build for all supported platforms
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  --tag myapp:multi \
  --push .
```

### 3. Platform-specific optimizations
```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.21-alpine AS builder

# Build platform (where build happens)
ARG BUILDPLATFORM
# Target platform (where image runs)
ARG TARGETPLATFORM

RUN echo "Building on $BUILDPLATFORM for $TARGETPLATFORM"

# Cross-compile Go application
RUN GOOS=$(echo $TARGETPLATFORM | cut -d/ -f1) \
    GOARCH=$(echo $TARGETPLATFORM | cut -d/ -f2) \
    go build -o app .

FROM --platform=$TARGETPLATFORM alpine:latest

COPY --from=builder /app .

CMD ["./app"]
```

### 4. Platform-aware Dockerfiles
```dockerfile
FROM ubuntu:20.04

# Use platform-specific packages
RUN apt-get update && apt-get install -y \
    $(if [ "$TARGETPLATFORM" = "linux/arm64" ]; then echo "package-for-arm64"; else echo "package-for-amd64"; fi) \
    && rm -rf /var/lib/apt/lists/*

# Platform-specific binary selection
ARG TARGETARCH
COPY binaries/${TARGETARCH}/myapp /usr/local/bin/myapp

CMD ["myapp"]
```

### 5. Multi-platform with Bake
Create `docker-bake.hcl`:
```hcl
variable "PLATFORMS" {
  default = ["linux/amd64", "linux/arm64"]
}

target "app" {
  platforms = PLATFORMS
  tags = ["myapp:latest"]
}

target "debug" {
  inherits = ["app"]
  tags = ["myapp:debug"]
  args = {
    DEBUG = "true"
  }
}
```

Build with Bake:
```bash
# Build for all platforms
docker buildx bake --push

# Build for specific platforms
docker buildx bake --set "*.platform=linux/amd64,linux/arm/v7"
```

### 6. Registry with multi-platform manifests
```bash
# Inspect multi-platform image
docker buildx imagetools inspect myapp:latest

# Create manifest list manually
docker buildx build \
  --platform linux/amd64 \
  -t myapp:amd64 \
  --load .

docker buildx build \
  --platform linux/arm64 \
  -t myapp:arm64 \
  --load .

# Create manifest
docker manifest create myapp:latest \
  --amend myapp:amd64 \
  --amend myapp:arm64

docker manifest push myapp:latest
```

## ❌ Incorrect: Single-platform builds

```bash
# Avoid building separate images manually
docker build -t myapp:amd64 .
docker build --platform linux/arm64 -t myapp:arm64 .

# No manifest management
```

## Key Benefits
- **Unified builds**: Single command for multiple platforms
- **Emulation support**: Build ARM on x86 and vice versa
- **Registry efficiency**: Single tag for all platforms
- **Cross-compilation**: Platform-aware build logic
- **CI/CD integration**: Automated multi-platform pipelines
- **Cost savings**: Reduced build infrastructure needs</content>
<parameter name="filePath">/Users/subrahmanyam/Projects/claude-skills/skills/docker-skill/rules/build/build-multiplatform.md