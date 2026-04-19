---
title: Container Runtime Security
impact: MEDIUM
impactDescription: Protects running containers from attacks and exploits
tags: docker, security, runtime, containers, isolation
---

## Container Runtime Security

**Problem:**
Running containers are vulnerable to attacks if not properly secured. Default configurations often expose unnecessary attack surfaces and privilege escalation vectors.

**Solution:**
Implement container runtime security with proper isolation, resource limits, and security policies following Docker security best practices.

❌ **Wrong: Insecure container runtime**
```yaml
# Insecure container
docker run -d --name myapp -p 80:8000 myapp:latest
```

✅ **Correct: Secure container runtime**
```yaml
version: '3.8'

services:
  secure_app:
    image: myregistry.com/myapp:1.2.3
    container_name: myapp_secure
    restart: unless-stopped

    # Security options
    security_opt:
      - no-new-privileges:true        # Prevent privilege escalation
      - apparmor:docker-default       # AppArmor security profile
      - seccomp:unconfined            # Seccomp security profile

    # Capability restrictions
    cap_drop:
      - ALL                          # Drop all capabilities
    cap_add:
      - NET_BIND_SERVICE            # Add only necessary capabilities
      - SYS_PTRACE                  # For debugging (development only)

    # User and privilege management
    user: appuser                   # Non-root user
    privileged: false               # No privileged mode
    read_only: true                 # Read-only filesystem

    # Resource limits
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.75'
        reservations:
          memory: 256M
          cpus: '0.25'

    # Temporary filesystems
    tmpfs:
      - /tmp                        # Temporary writable directory
      - /var/run                    # Runtime files
      - /var/cache                  # Cache files

    # Network security
    networks:
      - secure_network
    ports:
      - "127.0.0.1:8000:8000"       # Bind to localhost only

    # Environment security
    environment:
      - NODE_ENV=production
      - DEBUG=false
      - SECRET_KEY=${SECRET_KEY}
    env_file:
      - .env.secure                 # Secure environment file

    # Logging security
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "production,status"

    # Health checks
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

    # Labels for organization
    labels:
      com.example.service: "web-app"
      com.example.version: "1.2.3"
      com.example.maintainer: "security@company.com"

networks:
  secure_network:
    driver: bridge
    internal: true
```

**Security hardening techniques:**
```yaml
# Advanced security configuration
services:
  hardened_app:
    security_opt:
      # Custom seccomp profile
      - seccomp:/path/to/seccomp-profile.json

    # SELinux labels
    labels:
      - "com.example.selinux=true"

    # Custom AppArmor profile
    security_opt:
      - apparmor:my-custom-profile

    # Resource quotas
    deploy:
      resources:
        limits:
          pids: 1024                # Limit process count
          memory: 512M
          cpus: '0.75'
        reservations:
          memory: 256M
          cpus: '0.25'

    # Device restrictions
    devices:
      - /dev/null:/dev/null:rwm     # Only null device

    # DNS security
    dns:
      - 8.8.8.8                    # Trusted DNS servers
      - 1.1.1.1

    # Ulimit restrictions
    ulimits:
      nofile:                      # File descriptor limits
        soft: 1024
        hard: 2048
      nproc:                       # Process limits
        soft: 1024
        hard: 2048
```

**Runtime security monitoring:**
```bash
# Container security inspection
docker inspect my_container --format '{{.SecurityOpt}}'
docker inspect my_container --format '{{.HostConfig.Capabilities}}'

# Runtime security checks
docker exec my_container capsh --print  # Check capabilities
docker exec my_container whoami         # Check user
docker exec my_container mount          # Check mounts

# Security scanning
docker scan my_image:latest
trivy image my_image:latest

# Runtime monitoring
docker stats my_container
docker events --filter 'container=my_container'
```

**Security policies and compliance:**
```yaml
# Compliance-focused configuration
services:
  compliant_app:
    # CIS Docker Benchmark compliance
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - NET_RAW
      - SYS_ADMIN
      - SYS_PTRACE
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=100m

    # NIST compliance
    logging:
      driver: "syslog"
      options:
        syslog-address: "tcp://logserver.company.com:514"
        tag: "compliant_app"

    # SOX/PCI compliance
    environment:
      - COMPLIANCE_MODE=enabled
      - AUDIT_LOGGING=enabled

    # HIPAA compliance (healthcare)
    volumes:
      - audit_logs:/app/audit:ro
    secrets:
      - db_encryption_key
```

**Secrets management:**
```yaml
# Docker secrets (Swarm mode)
secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_key:
    file: ./secrets/api_key.txt

services:
  secure_app:
    secrets:
      - db_password
      - api_key
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - API_KEY_FILE=/run/secrets/api_key
```

**Container escape prevention:**
```yaml
services:
  escape_prevented:
    # Prevent container escape
    pid: host                      # Don't share PID namespace
    ipc: private                   # Private IPC namespace
    network_mode: bridge           # Isolated network

    # Mount restrictions
    volumes:
      - /dev/null:/dev/sda:rwm     # Block device access
    devices: []                    # No device access

    # Kernel restrictions
    sysctls:
      - net.ipv4.ip_forward=0       # Disable IP forwarding
      - net.ipv4.conf.all.accept_redirects=0

    # CPU/Memory limits
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.75'
        reservations:
          memory: 256M
          cpus: '0.25'
```

**Security auditing and monitoring:**
```yaml
# Security monitoring stack
services:
  falco:
    image: falcosecurity/falco:latest
    volumes:
      - /var/run/docker.sock:/host/var/run/docker.sock
      - /dev:/host/dev
      - /proc:/host/proc:ro
      - /boot:/host/boot:ro
      - /lib/modules:/host/lib/modules:ro
      - /usr:/host/usr:ro
    privileged: true

  auditbeat:
    image: docker.elastic.co/beats/auditbeat:8.6.0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - auditbeat.yml:/usr/share/auditbeat/auditbeat.yml
    user: root
```

**Common mistakes:**
- Running containers as root
- Not dropping unnecessary capabilities
- Missing resource limits
- Using privileged mode unnecessarily
- Not implementing health checks
- Ignoring security scanning results

**When to apply:**
- Production deployments
- Compliance requirements (PCI, HIPAA, SOX)
- Enterprise security policies
- Multi-tenant environments
- Internet-facing services