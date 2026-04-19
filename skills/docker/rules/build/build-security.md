---
title: Build Security
impact: CRITICAL
impactDescription: Ensures secure build processes with proper secret handling, authentication, and artifact verification
tags: docker, build, security, secrets, attestation
---

## Build Security

**Problem:**
Builds often require access to sensitive information like API keys, SSH keys, and tokens. Improper handling exposes secrets in images or build logs. Lack of provenance and SBOM generation makes it difficult to track dependencies and verify build integrity.

**Solution:**
Implement secure build practices using BuildKit's secret mounts, SSH forwarding, and attestation features to protect sensitive data while enabling necessary build access.

## ✅ Correct: Secure build implementation

### 1. Build secrets
```bash
# Pass secrets to build
echo "my-secret-key" | docker buildx build \
  --secret id=mysecret \
  -t myapp:latest .

# Use secrets in Dockerfile
RUN --mount=type=secret,id=mysecret \
    ./script.sh $(cat /run/secrets/mysecret)
```

```dockerfile
FROM python:3.11-slim

# Mount secret for pip configuration
RUN --mount=type=secret,id=pip_config \
    pip install --user -r requirements.txt \
    --config-file /run/secrets/pip_config
```

### 2. SSH access in builds
```bash
# Forward SSH agent
docker buildx build \
  --ssh default \
  -t myapp:latest .

# Use specific SSH key
docker buildx build \
  --ssh mykey=/path/to/key \
  -t myapp:latest .
```

```dockerfile
FROM alpine/git

# Clone private repository
RUN --mount=type=ssh \
    git clone git@github.com:myorg/private-repo.git /app
```

### 3. SBOM generation
```bash
# Generate Software Bill of Materials
docker buildx build \
  --attest type=sbom \
  --push \
  -t myregistry.com/myapp:latest .
```

```dockerfile
FROM python:3.11-slim

# Install dependencies with SBOM tracking
RUN pip install --no-cache-dir \
    --requirement requirements.txt \
    --report /tmp/sbom.json

# BuildKit will include this in attestation
```

### 4. Provenance attestations
```bash
# Generate SLSA provenance
docker buildx build \
  --attest type=provenance,mode=max \
  --push \
  -t myregistry.com/myapp:latest .
```

### 5. Combined attestations
```bash
# Generate both SBOM and provenance
docker buildx build \
  --attest type=sbom \
  --attest type=provenance \
  --push \
  -t myregistry.com/myapp:latest .
```

### 6. Secure multi-stage builds
```dockerfile
FROM node:18-alpine AS builder

# Install dependencies securely
RUN --mount=type=secret,id=npm_token \
    echo "//registry.npmjs.org/:_authToken=$(cat /run/secrets/npm_token)" > ~/.npmrc && \
    npm ci && \
    rm ~/.npmrc

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
```

### 7. Registry authentication in builds
```bash
# Authenticate for private base images
docker buildx build \
  --build-context private=registry.example.com/private/base:latest \
  -t myapp:latest .
```

### 8. Secure Bake configurations
```hcl
target "secure-app" {
  context = "."
  secrets = [
    "id=npm_token,src=.npm-token"
  ]
  ssh = ["default"]
  attest = [
    "type=sbom",
    "type=provenance"
  ]
}
```

### 9. Verification and inspection
```bash
# Inspect image attestations
docker buildx imagetools inspect myregistry.com/myapp:latest \
  --format "{{json .Provenance.SLSA }}"

# Verify SBOM
docker buildx imagetools inspect myregistry.com/myapp:latest \
  --format "{{json .SBOM }}"

# Check image signature
cosign verify myregistry.com/myapp:latest
```

## ❌ Incorrect: Insecure build practices

```dockerfile
FROM python:3.11-slim

# Avoid embedding secrets in image
ENV API_KEY=my-secret-key
RUN echo $API_KEY > /app/config

# Avoid exposing secrets in build logs
RUN git clone https://user:token@github.com/org/repo.git /app
```

```bash
# Avoid insecure secret passing
docker build --build-arg API_KEY=secret -t myapp:latest .
```

## Key Benefits
- **Secret isolation**: Secrets not exposed in images or logs
- **SSH forwarding**: Secure access to private repositories
- **Supply chain security**: SBOM and provenance tracking
- **Compliance**: Meet security standards and regulations
- **Auditability**: Trace build origins and dependencies
- **Vulnerability management**: Identify and track dependencies</content>
<parameter name="filePath">skills/docker-skill/rules/build/build-security.md