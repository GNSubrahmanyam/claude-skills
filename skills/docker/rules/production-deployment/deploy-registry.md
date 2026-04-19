# Container Registry Management (HIGH)

**Impact:** HIGH - Ensures secure and efficient container distribution

**Problem:**
Container images need secure storage, versioning, and distribution. Poor registry management leads to security vulnerabilities, version confusion, and deployment issues.

**Solution:**
Implement proper container registry practices with security scanning, versioning, and access controls.

❌ **Wrong: Insecure registry usage**
```bash
# Using public registries without security
docker pull ubuntu:latest
docker push myapp:latest
```

✅ **Correct: Secure registry management**
```bash
# Private registry setup
export REGISTRY_URL=myregistry.com
export IMAGE_NAME=myapp
export VERSION=1.2.3

# Login securely
echo $REGISTRY_TOKEN | docker login $REGISTRY_URL --username oauth2 --password-stdin

# Build with security labels
docker build \
  --label "org.opencontainers.image.version=${VERSION}" \
  --label "org.opencontainers.image.created=$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  --label "org.opencontainers.image.source=https://github.com/company/myapp" \
  -t $REGISTRY_URL/$IMAGE_NAME:$VERSION \
  -t $REGISTRY_URL/$IMAGE_NAME:latest \
  .

# Security scanning
docker scan $REGISTRY_URL/$IMAGE_NAME:$VERSION

# Vulnerability assessment
trivy image --exit-code 1 --no-progress $REGISTRY_URL/$IMAGE_NAME:$VERSION

# Push with verification
docker push $REGISTRY_URL/$IMAGE_NAME:$VERSION
docker push $REGISTRY_URL/$IMAGE_NAME:latest

# Verify push
docker pull $REGISTRY_URL/$IMAGE_NAME:$VERSION
docker inspect $REGISTRY_URL/$IMAGE_NAME:$VERSION | jq '.Config.Labels'
```

**Registry security:**
```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Sign images
docker trust sign $REGISTRY_URL/$IMAGE_NAME:$VERSION

# Verify signatures
docker trust inspect --pretty $REGISTRY_URL/$IMAGE_NAME:$VERSION

# Key management
docker trust key generate mykey
docker trust signer add --key mykey.pem admin $REGISTRY_URL/$IMAGE_NAME
```

**Registry cleanup and maintenance:**
```bash
# List repositories and tags
curl -u $REGISTRY_USER:$REGISTRY_PASS \
  https://$REGISTRY_URL/v2/_catalog | jq '.repositories[]'

# List tags for specific image
curl -u $REGISTRY_USER:$REGISTRY_PASS \
  https://$REGISTRY_URL/v2/$IMAGE_NAME/tags/list | jq '.tags[]'

# Delete old tags (if registry supports)
# Note: Most registries don't allow direct deletion via API
# Use registry garbage collection instead

# Registry maintenance script
#!/bin/bash
REGISTRY=$REGISTRY_URL
REPO=$IMAGE_NAME
KEEP_DAYS=30

# Calculate cutoff date
CUTOFF_DATE=$(date -d "$KEEP_DAYS days ago" +%Y-%m-%d)

echo "Cleaning up images older than $CUTOFF_DATE"

# This would require registry API integration
# For demonstration purposes:
docker system prune -f
docker image prune -f --filter "until=${KEEP_DAYS}d"
```

**Multi-registry deployment:**
```yaml
# CI/CD with multiple registries
# .github/workflows/deploy.yml
name: Deploy to Multiple Registries

on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        registry: [
          { name: 'Docker Hub', url: 'docker.io', org: 'mycompany' },
          { name: 'AWS ECR', url: '${{ secrets.AWS_ECR_URL }}', org: '' },
          { name: 'Google GCR', url: 'gcr.io', org: '${{ secrets.GCP_PROJECT }}' }
        ]

    steps:
    - uses: actions/checkout@v3

    - name: Login to ${{ matrix.registry.name }}
      uses: docker/login-action@v2
      with:
        registry: ${{ matrix.registry.url }}
        username: ${{ secrets[format('{0}_USERNAME', matrix.registry.name)] }}
        password: ${{ secrets[format('{0}_PASSWORD', matrix.registry.name)] }}

    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ${{ matrix.registry.url }}/${{ matrix.registry.org }}/${{ env.IMAGE_NAME }}:${{ github.ref_name }}
        labels: |
          org.opencontainers.image.version=${{ github.ref_name }}
          org.opencontainers.image.created=${{ env.BUILD_DATE }}
```

**Registry mirroring and caching:**
```yaml
# Docker registry mirror configuration
# daemon.json
{
  "registry-mirrors": [
    "https://mirror.gcr.io",
    "https://docker-mirror.company.com"
  ],
  "insecure-registries": [
    "docker-mirror.company.com:5000"
  ]
}

# Pull through cache setup
version: '3.8'
services:
  registry-mirror:
    image: registry:2.8
    environment:
      REGISTRY_PROXY_REMOTEURL: https://registry-1.docker.io
      REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY: /var/lib/registry
    volumes:
      - registry_cache:/var/lib/registry
    ports:
      - "5000:5000"

volumes:
  registry_cache:
```

**Common mistakes:**
- Pushing without security scanning
- Using latest tags in production
- Not implementing access controls
- Ignoring registry storage costs
- Not implementing cleanup policies

**When to apply:**
- Enterprise container deployments
- Multi-environment management
- Security compliance requirements
- Cost optimization for registry storage
- CI/CD pipeline integration