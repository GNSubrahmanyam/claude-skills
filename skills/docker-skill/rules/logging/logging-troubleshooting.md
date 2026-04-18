# Docker Container Debugging and Troubleshooting
**Impact:** MEDIUM - Enables effective diagnosis and resolution of container issues in development and production

**Problem:**
Containerized applications are complex with multiple interacting components. Debugging requires understanding container internals, networking, and orchestration. Without proper troubleshooting tools, issues remain unresolved, impacting development velocity and production stability.

**Solution:**
Implement comprehensive container debugging and troubleshooting methodologies with proper tools, logging, and diagnostic procedures.

## ✅ Correct: Container debugging implementation

### 1. Container inspection and diagnostics
```bash
# Inspect container configuration
docker inspect myapp

# View container processes
docker top myapp

# Check container stats
docker stats myapp

# View container logs
docker logs myapp
docker logs -f myapp  # Follow logs
docker logs --tail 100 myapp  # Last 100 lines
docker logs --since "1h" myapp  # Last hour

# Check container health
docker ps --filter health=unhealthy
```

### 2. Interactive debugging
```bash
# Execute commands in running container
docker exec -it myapp bash

# Debug with additional tools
docker exec -it myapp sh -c 'apt-get update && apt-get install -y curl net-tools'

# Copy files for analysis
docker cp myapp:/app/logs/error.log ./error.log

# Run debug container with same image
docker run -it --rm myapp:latest bash
```

### 3. Network troubleshooting
```bash
# Check container networking
docker network ls
docker network inspect bridge

# Test connectivity
docker exec myapp ping google.com
docker exec myapp curl -I http://other-service:8080

# View network traffic
docker run --net container:myapp nicolaka/netshoot tcpdump -i eth0

# DNS resolution check
docker exec myapp nslookup other-service
docker exec myapp cat /etc/resolv.conf
```

### 4. Volume and storage debugging
```bash
# Inspect volumes
docker volume ls
docker volume inspect myvolume

# Check volume contents
docker run --rm -v myvolume:/data alpine ls -la /data

# Mount issues diagnosis
docker inspect myapp | jq '.Mounts'
docker inspect myapp | jq '.HostConfig.Binds'
```

### 5. Image and layer analysis
```bash
# Analyze image layers
docker history myapp:latest

# Inspect image configuration
docker inspect myapp:latest

# Compare images
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  wagoodman/dive myapp:latest

# Check for image vulnerabilities
docker scout cves myapp:latest
```

### 6. Performance troubleshooting
```bash
# Monitor resource usage
docker stats --no-stream

# Check container limits
docker inspect myapp | jq '.HostConfig.Memory'
docker inspect myapp | jq '.HostConfig.CpuQuota'

# Profile application performance
docker exec myapp top
docker exec myapp ps aux

# Memory analysis
docker exec myapp free -h
docker exec myapp cat /proc/meminfo
```

### 7. Docker Compose debugging
```bash
# Validate compose file
docker compose config

# View service logs
docker compose logs
docker compose logs -f web
docker compose logs --tail=50 api

# Inspect service containers
docker compose ps

# Execute in service container
docker compose exec web bash

# Check service dependencies
docker compose ps --filter dependency
```

### 8. Swarm debugging
```bash
# Check cluster status
docker node ls
docker service ls

# Inspect service
docker service inspect myservice
docker service ps myservice

# View service logs
docker service logs myservice

# Check network connectivity
docker exec $(docker ps -q -f name=myservice) ping other-service

# Debug overlay networks
docker network ls --filter driver=overlay
```

### 9. Common debugging scenarios
```bash
# Application won't start
docker logs myapp
docker inspect myapp | jq '.State'
docker exec myapp ps aux

# Port binding issues
docker port myapp
netstat -tlnp | grep :8080
docker inspect myapp | jq '.NetworkSettings.Ports'

# Environment variable problems
docker exec myapp env | grep MY_VAR
docker inspect myapp | jq '.Config.Env'

# Permission issues
docker exec myapp id
docker inspect myapp | jq '.Config.User'
ls -la /host/path
```

### 10. Advanced debugging tools
```yaml
version: '3.8'

services:
  debugger:
    image: nicolaka/netshoot
    network_mode: host
    cap_add:
      - NET_ADMIN
      - NET_RAW
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: sleep infinity

  sysdig:
    image: sysdig/sysdig
    privileged: true
    volumes:
      - /var/run/docker.sock:/host/var/run/docker.sock
      - /dev:/host/dev
      - /proc:/host/proc:ro
      - /boot:/host/boot:ro
      - /lib/modules:/host/lib/modules:ro
      - /usr:/host/usr:ro

  falco:
    image: falcosecurity/falco:latest
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /dev:/host/dev
      - /etc/falco:/etc/falco
```

### 11. Log analysis for troubleshooting
```bash
# Search for errors
docker logs myapp 2>&1 | grep -i error

# Analyze log patterns
docker logs myapp | awk '{print $1}' | sort | uniq -c | sort -nr

# Correlate logs with timestamps
docker compose logs --timestamps | grep "ERROR\|WARN"

# Export logs for analysis
docker compose logs > debug.log
```

### 12. Container crash analysis
```bash
# Check exit code
docker ps -a --filter name=myapp --format "table {{.Names}}\t{{.Status}}"

# View crash logs
docker logs $(docker ps -a -q -f name=myapp -f status=exited)

# Inspect crashed container
docker inspect $(docker ps -a -q -f name=myapp -f status=exited)

# Check system logs
journalctl -u docker | tail -50
sudo dmesg | tail -20
```

### 13. Resource constraint debugging
```bash
# Check if hitting limits
docker stats myapp --no-stream

# Memory issues
docker exec myapp free -h
docker inspect myapp | jq '.HostConfig.Memory'

# CPU throttling
docker exec myapp cat /sys/fs/cgroup/cpu/cpu.stat

# Disk space
docker exec myapp df -h
docker system df
```

### 14. Network debugging tools
```bash
# Use netshoot for network debugging
docker run --rm -it --net container:myapp nicolaka/netshoot

# Inside container:
# Check routes
ip route

# Check DNS
nslookup google.com

# Test connectivity
curl -v other-service:8080

# Packet capture
tcpdump -i eth0 port 80

# Network statistics
netstat -tlnp
ss -tlnp
```

### 15. Production troubleshooting
```bash
# Zero-downtime debugging
docker service logs myservice --since 1h

# Rolling debug deployment
docker service update --image myapp:debug myservice

# Inspect without stopping
docker exec $(docker ps -q -f name=myservice) ps aux

# Health check debugging
docker inspect myservice | jq '.Spec.TaskTemplate.ContainerSpec.Healthcheck'
```

## ❌ Incorrect: Debugging antipatterns

```bash
# ❌ Debugging in production
docker exec -it prod-app bash  # Direct access

# ❌ No logging
docker run myapp  # No way to debug issues

# ❌ Ignoring exit codes
docker run myapp || true  # Hiding failures

# ❌ Manual log inspection
tail -f /var/lib/docker/containers/*/json.log  # Complex and error-prone
```

## Key Benefits
- **Rapid issue resolution**: Systematic debugging approach
- **Production safety**: Non-intrusive troubleshooting
- **Comprehensive diagnostics**: Multiple debugging tools
- **Root cause analysis**: Deep inspection capabilities
- **Performance insights**: Resource usage analysis
- **Network visibility**: Complete connectivity debugging</content>
<parameter name="filePath">skills/docker-skill/rules/logging/logging-troubleshooting.md