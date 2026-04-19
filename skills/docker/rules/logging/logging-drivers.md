---
title: Docker Logging Drivers and Configuration
impact: MEDIUM
impactDescription: Enables effective log collection, aggregation, and monitoring for containerized applications
tags: docker, logging, drivers, aggregation, monitoring
---

## Docker Logging Drivers and Configuration

**Problem:**
Container logs are scattered across hosts and containers, making debugging difficult. Default logging doesn't provide centralized logging, log rotation, or structured logging. Without proper logging, troubleshooting production issues becomes challenging.

**Solution:**
Implement comprehensive Docker logging strategies with appropriate drivers, centralized aggregation, log rotation, and monitoring integration.

## ✅ Correct: Docker logging implementation

### 1. Choosing the right logging driver
```bash
# JSON file logging (default, good for development)
docker run --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  nginx

# Syslog for system integration
docker run --log-driver syslog \
  --log-opt syslog-address=tcp://syslog.example.com:514 \
  --log-opt tag="{{.Name}}/{{.ID}}" \
  nginx

# Journald for systemd environments
docker run --log-driver journald \
  --log-opt tag="{{.Name}}" \
  nginx

# Fluentd for advanced aggregation
docker run --log-driver fluentd \
  --log-opt fluentd-address=fluentd:24224 \
  --log-opt tag=docker.{{.Name}} \
  nginx
```

### 2. Docker Compose logging configuration
```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
        labels: "production_status"
    labels:
      - "production_status=production"

  web:
    image: nginx:alpine
    logging:
      driver: fluentd
      options:
        fluentd-address: "fluentd:24224"
        tag: "nginx.{{.Name}}"
        labels: "service"
    labels:
      - "service=web"

  fluentd:
    image: fluent/fluent-bit:latest
    ports:
      - "24224:24224"
    volumes:
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf
    logging:
      driver: json-file
```

### 3. Centralized logging with ELK stack
```yaml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  logstash:
    image: logstash:8.11.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  app:
    image: myapp:latest
    logging:
      driver: gelf
      options:
        gelf-address: "udp://logstash:12201"
        tag: "{{.Name}}"
```

### 4. Log aggregation with Fluentd
```yaml
# fluent-bit.conf
[INPUT]
    Name forward
    Listen 0.0.0.0
    Port 24224

[OUTPUT]
    Name elasticsearch
    Match *
    Host elasticsearch
    Port 9200
    Index docker
    Type docker_logs
```

```yaml
services:
  fluentd:
    image: fluent/fluent-bit:latest
    ports:
      - "24224:24224"
    volumes:
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf
    environment:
      - FLUENTD_CONF=fluent-bit.conf

  app:
    image: myapp:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: "fluentd:24224"
        tag: "app.{{.Name}}"
```

### 5. Structured logging best practices
```python
# Python structured logging
import logging
import json
import sys

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'service': 'myapp',
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_entry)

# Configure logging
logger = logging.getLogger()
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JSONFormatter())
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Usage
logger.info("Application started", extra={'user': '123', 'action': 'login'})
```

### 6. Log rotation and management
```bash
# Automatic log rotation
docker run --log-driver json-file \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  --log-opt compress=true \
  nginx

# Manual log rotation
docker logs myapp > app.log
docker run --log-driver none nginx  # Temporarily disable logging
```

### 7. Log shipping to cloud services
```yaml
# AWS CloudWatch
services:
  app:
    image: myapp:latest
    logging:
      driver: awslogs
      options:
        awslogs-region: us-east-1
        awslogs-group: myapp-logs
        awslogs-stream: "{{.Name}}"

# Google Cloud Logging
services:
  app:
    image: myapp:latest
    logging:
      driver: gcplogs
      options:
        gcp-project: my-project
        gcp-log-cmd: true
```

### 8. Log monitoring and alerting
```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail.yml:/etc/promtail/promtail.yml
    command: -config.file=/etc/promtail/promtail.yml

volumes:
  grafana_data:
  loki_data:
```

### 9. Debugging with logs
```bash
# View container logs
docker logs myapp

# Follow logs
docker logs -f myapp

# View logs with timestamps
docker logs -t myapp

# Filter logs by time
docker logs --since "2024-01-01T00:00:00" myapp

# View logs for crashed containers
docker logs $(docker ps -a --filter status=exited -q)
```

### 10. Log analysis and correlation
```bash
# Search logs across containers
docker-compose logs | grep ERROR

# Correlate logs with timestamps
docker-compose logs --timestamps | grep "2024-01-01"

# Export logs for analysis
docker-compose logs > application.log

# Parse JSON logs
docker logs myapp | jq '. | select(.level == "ERROR")'
```

## ❌ Incorrect: Logging antipatterns

```bash
# ❌ No log rotation
docker run nginx  # Logs can fill disk

# ❌ Logging to stdout/stderr only
docker run --log-driver none nginx  # No log persistence

# ❌ Mixed log formats
# Some JSON, some plain text - hard to parse

# ❌ No centralized logging
# Logs scattered across multiple hosts
```

## Key Benefits
- **Centralized logging**: All logs in one place for analysis
- **Structured logging**: Consistent, parseable log format
- **Log rotation**: Prevent disk space issues
- **Monitoring integration**: Real-time alerting and dashboards
- **Debugging efficiency**: Easy log correlation and search
- **Compliance**: Audit trails and log retention</content>
<parameter name="filePath">skills/docker-skill/rules/logging/logging-drivers.md