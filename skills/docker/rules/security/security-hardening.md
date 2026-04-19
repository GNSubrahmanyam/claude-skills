---
title: Container Runtime Security Hardening
impact: HIGH
impactDescription: Protects running containers from attacks and unauthorized access
tags: docker, security, hardening, runtime, containers
---

## Container Runtime Security Hardening

**Problem:**
Containers run with elevated privileges by default, exposing attack surfaces. Without hardening, containers can be compromised, leading to data breaches or system compromise. Runtime security requires multiple layers of protection.

**Solution:**
Implement comprehensive container runtime security hardening with proper user management, resource limits, security profiles, and monitoring.

## ✅ Correct: Container security hardening

### 1. User and privilege management
```yaml
# docker-compose.yml with security hardening
version: '3.8'

services:
  app:
    image: myapp:latest
    user: appuser:appgroup  # Non-root user
    security_opt:
      - no-new-privileges:true  # Prevent privilege escalation
    cap_drop:
      - ALL  # Drop all capabilities
    cap_add:
      - NET_BIND_SERVICE  # Add only needed capabilities
    read_only: true  # Read-only filesystem
    tmpfs:
      - /tmp  # Temporary writable directories
      - /var/run
    volumes:
      - app_data:/app/data  # Persistent data volume
```

### 2. Docker daemon security
```bash
# Secure Docker daemon configuration
# /etc/docker/daemon.json
{
  "icc": false,                    # Disable inter-container communication
  "no-new-privileges": true,       # Prevent privilege escalation
  "userns-remap": "default",       # User namespace remapping
  "live-restore": true,            # Keep containers running during daemon updates
  "iptables": true,                # Enable iptables rules
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Secure daemon socket
# Only allow root and docker group access
sudo chown root:docker /var/run/docker.sock
sudo chmod 660 /var/run/docker.sock
```

### 3. Seccomp and AppArmor/SELinux
```yaml
services:
  secure_app:
    image: myapp:latest
    security_opt:
      - seccomp:unconfined  # Use default seccomp profile
      - apparmor:docker-default  # AppArmor on Ubuntu
      - label:type:container_t   # SELinux on RHEL/CentOS
    cap_drop:
      - NET_RAW
      - SYS_ADMIN
      - SYS_PTRACE
    read_only: true
```

### 4. Network security hardening
```yaml
services:
  web:
    image: nginx:alpine
    ports:
      - "443:443"
    networks:
      - frontend
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true

  api:
    image: myapi:latest
    networks:
      - backend
    security_opt:
      - no-new-privileges:true
    # No external ports - internal only

  db:
    image: postgres:15
    networks:
      - database
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - NET_RAW  # Prevent network sniffing

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access
  database:
    driver: bridge
    internal: true
```

### 5. Secret management security
```yaml
services:
  app:
    image: myapp:latest
    secrets:
      - source: db_password
        target: /run/secrets/db_password
        mode: 0400  # Read-only for owner
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password
    security_opt:
      - no-new-privileges:true
    user: appuser

secrets:
  db_password:
    external: true
    # Ensure secrets are encrypted at rest
```

### 6. Resource limits and quotas
```yaml
services:
  app:
    image: myapp:latest
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
          pids: 1024
        reservations:
          cpus: '0.5'
          memory: 512M
    security_opt:
      - no-new-privileges:true
    # Prevent fork bombs and resource exhaustion
```

### 7. Logging and monitoring security
```yaml
services:
  app:
    image: myapp:latest
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: 3
    security_opt:
      - no-new-privileges:true
    # Ensure logs don't leak sensitive information
```

### 8. Image security validation
```bash
# Scan images before deployment
docker scout cves myapp:latest

# Verify image signatures
cosign verify myregistry.com/myapp:latest

# Check image provenance
docker buildx imagetools inspect myregistry.com/myapp:latest \
  --format "{{json .Provenance}}"
```

### 9. Runtime security monitoring
```yaml
services:
  security_monitor:
    image: falcosecurity/falco:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./falco.yml:/etc/falco/falco.yaml
    privileged: true  # Required for container monitoring
    network_mode: host

  # Application with security monitoring
  app:
    image: myapp:latest
    security_opt:
      - no-new-privileges:true
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
```

### 10. Compliance and auditing
```bash
# Enable Docker daemon audit logging
sudo systemctl edit docker
# Add: --log-driver=syslog --log-opt syslog-facility=daemon

# Container audit logging
docker run --log-driver=syslog \
  --log-opt syslog-facility=local0 \
  myapp:latest

# Security compliance checks
docker scout policy myapp:latest
```

## ❌ Incorrect: Security hardening antipatterns

```yaml
# ❌ Running as root
services:
  app:
    image: myapp:latest
    # No user specified - runs as root

# ❌ Excessive capabilities
services:
  app:
    image: myapp:latest
    cap_add:
      - SYS_ADMIN  # Dangerous capability

# ❌ No resource limits
services:
  app:
    image: myapp:latest
    # Can consume unlimited resources

# ❌ Insecure networking
services:
  db:
    image: postgres:15
    ports:
      - "5432:5432"  # Exposed externally
```

## Key Benefits
- **Attack surface reduction**: Minimal privileges and capabilities
- **Privilege escalation prevention**: No-new-privileges and user namespaces
- **Resource protection**: Limits prevent resource exhaustion
- **Network isolation**: Proper network segmentation
- **Compliance**: Meet security standards and regulations
- **Monitoring**: Runtime security monitoring and alerting</content>
<parameter name="filePath">skills/docker-skill/rules/security/security-hardening.md