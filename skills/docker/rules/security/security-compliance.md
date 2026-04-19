---
title: Docker Security Compliance and Best Practices
impact: HIGH
impactDescription: Ensures container deployments meet security standards and regulatory requirements
tags: docker, security, compliance, best-practices, cis
---

## Docker Security Compliance and Best Practices

**Problem:**
Organizations must comply with security standards like CIS Docker benchmarks, NIST, and industry regulations. Without compliance frameworks, deployments risk security violations and audit failures. Docker security requires systematic implementation of best practices.

**Solution:**
Implement comprehensive Docker security compliance framework with CIS benchmarks, security policies, and audit procedures.

## ✅ Correct: Security compliance implementation

### 1. CIS Docker Benchmark compliance
```bash
# CIS 1.1.1 - Run Docker daemon as non-root user
sudo groupadd docker
sudo usermod -aG docker $USER

# CIS 1.2.1 - Restrict network traffic
sudo iptables -P FORWARD DROP
sudo iptables -A DOCKER-USER -j DROP

# CIS 2.1 - Run containers as non-root user
docker run --user 1000:1000 myapp:latest

# CIS 2.2 - Use trusted base images
FROM alpine:3.18
FROM ubuntu:22.04

# CIS 2.3 - Scan images for vulnerabilities
docker scout cves myapp:latest

# CIS 2.4 - Do not use privileged containers
docker run --privileged=false myapp:latest

# CIS 2.5 - Do not mount sensitive directories
# Avoid: -v /:/host
docker run -v /app/data:/app/data myapp:latest
```

### 2. Security policy implementation
```yaml
# security-policy.yml for Docker Scout
version: "1.0"
name: "Docker Security Policy"

checks:
  - name: "No critical vulnerabilities"
    type: "cve"
    severity: "critical"
    threshold: 0

  - name: "No high vulnerabilities in production"
    type: "cve"
    severity: "high"
    threshold: 0

  - name: "Base image freshness"
    type: "base_image_age"
    threshold: "90d"

  - name: "SBOM completeness"
    type: "sbom"
    required: true

policies:
  - name: "production"
    checks:
      - "No critical vulnerabilities"
      - "No high vulnerabilities in production"
      - "Base image freshness"
      - "SBOM completeness"
```

### 3. Image security best practices
```dockerfile
# Secure Dockerfile best practices
FROM alpine:3.18 AS base

# CIS 4.1 - Use current base images
# CIS 4.2 - Use specific image tags
FROM ubuntu:22.04

# CIS 4.3 - Use trusted registries
FROM registry.example.com/trusted-base:latest

# CIS 4.4 - Install only required packages
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# CIS 4.5 - Scan images
RUN apk add --no-cache curl
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# CIS 4.6 - Use non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser
USER appuser

# CIS 4.7 - Use COPY instead of ADD
COPY . /app/
WORKDIR /app

CMD ["./myapp"]
```

### 4. Runtime security compliance
```yaml
# docker-compose.yml with security compliance
version: '3.8'

services:
  web:
    image: nginx:alpine
    # CIS 5.1 - Use read-only filesystems
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    # CIS 5.2 - Drop capabilities
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    # CIS 5.3 - No privileged containers
    privileged: false
    # CIS 5.4 - Use security options
    security_opt:
      - no-new-privileges:true
    # CIS 5.5 - Resource limits
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  api:
    image: myapi:latest
    # CIS 5.6 - Use secrets for sensitive data
    secrets:
      - source: api_key
        target: /run/secrets/api_key
    environment:
      - API_KEY_FILE=/run/secrets/api_key
    # CIS 5.7 - Health checks
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

secrets:
  api_key:
    external: true
```

### 5. Network security compliance
```yaml
# CIS 6.1 - Use user-defined networks
services:
  web:
    networks:
      - frontend
  api:
    networks:
      - frontend
      - backend
  db:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # CIS 6.2 - Restrict inter-container traffic
```

### 6. Logging and audit compliance
```yaml
# CIS 7.1 - Use logging drivers
services:
  app:
    image: myapp:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    # CIS 7.2 - Log security events
    environment:
      - LOG_LEVEL=INFO
```

### 7. Registry security compliance
```bash
# CIS 3.1 - Use trusted registries
docker pull registry.example.com/myapp:latest

# CIS 3.2 - Scan images
docker scout cves registry.example.com/myapp:latest

# CIS 3.3 - Use content trust
export DOCKER_CONTENT_TRUST=1
docker pull registry.example.com/myapp:latest

# CIS 3.4 - Verify image signatures
cosign verify registry.example.com/myapp:latest
```

### 8. Host security compliance
```bash
# CIS 1.1 - Keep Docker updated
sudo apt-get update && sudo apt-get upgrade docker.io

# CIS 1.2 - Enable Docker daemon auditing
sudo auditctl -w /usr/bin/docker -k docker
sudo auditctl -w /var/lib/docker -k docker

# CIS 1.3 - Configure Docker daemon
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "icc": false,
  "no-new-privileges": true,
  "userns-remap": "default"
}
EOF

# CIS 1.4 - Secure Docker socket
sudo chmod 660 /var/run/docker.sock
```

### 9. Monitoring and alerting
```yaml
services:
  monitoring:
    image: falcosecurity/falco:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    privileged: true
    # CIS compliance monitoring

  logging:
    image: fluent/fluent-bit:latest
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    # CIS 7.3 - Centralize logs
```

### 10. Compliance reporting and auditing
```bash
# Generate compliance reports
docker scout policy myapp:latest --format sarif > compliance-report.sarif

# Audit container configurations
docker inspect myapp_container | jq '.Config.User, .HostConfig.Privileged'

# Check for compliance violations
# Use tools like Dockle, Trivy, or Clair

# Document compliance evidence
# Maintain audit trails for CIS controls
```

## ❌ Incorrect: Compliance violations

```yaml
# ❌ CIS violations
services:
  app:
    image: myapp:latest
    privileged: true  # CIS 5.3 violation
    cap_add:
      - SYS_ADMIN   # CIS 5.2 violation
    user: root      # CIS 2.1 violation
```

```bash
# ❌ Non-compliant practices
docker run --privileged myapp:latest  # Privilege escalation risk
docker run -p 22:22 myapp:latest      # Exposing SSH
docker run -v /:/host myapp:latest    # Host filesystem access
```

## Key Benefits
- **Regulatory compliance**: Meet CIS, NIST, and industry standards
- **Audit readiness**: Comprehensive security documentation
- **Risk reduction**: Proactive security implementation
- **Policy enforcement**: Automated compliance checking
- **Incident prevention**: Security best practices implementation
- **Continuous compliance**: Ongoing monitoring and validation</content>
<parameter name="filePath">skills/docker-skill/rules/security/security-compliance.md