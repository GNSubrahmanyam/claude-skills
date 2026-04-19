---
title: Docker Log Aggregation and Monitoring
impact: MEDIUM
impactDescription: Enables centralized log management, real-time monitoring, and proactive issue detection
tags: docker, logging, aggregation, monitoring, alerting
---

## Docker Log Aggregation and Monitoring

**Problem:**
Distributed container logs are difficult to correlate and analyze. Without aggregation, monitoring blind spots exist. Teams can't detect issues early or perform effective root cause analysis across services.

**Solution:**
Implement comprehensive log aggregation with monitoring, alerting, and analysis capabilities for containerized applications.

## ✅ Correct: Log aggregation implementation

### 1. ELK stack for log aggregation
```yaml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    volumes:
      - es_data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3

  logstash:
    image: logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf:ro
      - ./logstash.yml:/usr/share/logstash/config/logstash.yml:ro
    ports:
      - "5044:5044"
      - "5000:5000/udp"
    environment:
      LS_JAVA_OPTS: "-Xmx256m -Xms256m"
    depends_on:
      elasticsearch:
        condition: service_healthy

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  es_data:
```

```properties
# logstash.conf
input {
  tcp {
    port => 5000
    codec => json
  }
  udp {
    port => 5000
    codec => json
  }
}

filter {
  if [docker][container_id] {
    mutate {
      add_field => { "container_id" => "%{[docker][container_id]}" }
    }
  }
  
  date {
    match => ["timestamp", "ISO8601"]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "docker-%{+YYYY.MM.dd}"
  }
}
```

### 2. Application logging with structured data
```python
# Python application with structured logging
import logging
import json
from pythonjsonlogger import jsonlogger

class DockerJSONFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record, record, message_dict):
        super().add_fields(log_record, record, message_dict)
        log_record['service'] = 'myapp'
        log_record['version'] = '1.0.0'
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id

logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = DockerJSONFormatter(
    '%(asctime)s %(name)s %(levelname)s %(message)s'
)
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Usage with correlation ID
import uuid
request_id = str(uuid.uuid4())
logger.info("Processing request", extra={
    'request_id': request_id,
    'user_id': '12345',
    'endpoint': '/api/users'
})
```

### 3. Fluentd for lightweight aggregation
```yaml
version: '3.8'

services:
  fluentd:
    image: fluent/fluentd:v1.16
    volumes:
      - ./fluent.conf:/fluentd/etc/fluent.conf
    ports:
      - "24224:24224"
    environment:
      - FLUENTD_CONF=fluent.conf

  app:
    image: myapp:latest
    logging:
      driver: fluentd
      options:
        fluentd-address: "fluentd:24224"
        tag: "app.{{.Name}}"
        fluentd-async-connect: "true"
```

```xml
# fluent.conf
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<match app.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name docker.${tag}
  <buffer>
    @type file
    path /var/log/fluentd/buffer
    flush_interval 10s
  </buffer>
</match>
```

### 4. Monitoring with Prometheus and Grafana
```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'

  grafana:
    image: grafana/grafana:latest
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
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./promtail.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
```

### 5. Log correlation and tracing
```python
# Distributed tracing with correlation IDs
import logging
import uuid
from contextvars import ContextVar

request_id: ContextVar[str] = ContextVar('request_id')

class CorrelationFilter(logging.Filter):
    def filter(self, record):
        try:
            record.request_id = request_id.get()
        except LookupError:
            record.request_id = 'unknown'
        return True

# Configure logging with correlation
logger = logging.getLogger()
logger.addFilter(CorrelationFilter())

# Middleware for web frameworks
def correlation_middleware(get_response):
    def middleware(request):
        request_id.set(str(uuid.uuid4()))
        response = get_response(request)
        response['X-Request-ID'] = request_id.get()
        return response
    return middleware

# Usage
logger.info("Processing payment", extra={
    'amount': 99.99,
    'currency': 'USD',
    'user_id': '12345'
})
```

### 6. Alerting and notifications
```yaml
# Alertmanager configuration
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email'
  routes:
  - match:
      severity: critical
    receiver: 'pagerduty'

receivers:
- name: 'email'
  email_configs:
  - to: 'team@example.com'
    
- name: 'pagerduty'
  pagerduty_configs:
  - service_key: 'your-pagerduty-key'
```

### 7. Log retention and archiving
```bash
# Configure log retention in Docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Elasticsearch index lifecycle management
PUT _ilm/policy/docker_logs
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_size": "50gb"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "forcemerge": {
            "max_num_segments": 1
          },
          "shrink": {
            "number_of_shards": 1
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

### 8. Performance monitoring
```yaml
services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker:/var/lib/docker:ro
      - /dev/disk:/dev/disk:ro
    ports:
      - "8080:8080"
    privileged: true

  node-exporter:
    image: prom/node-exporter:latest
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/root'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"
```

### 9. Log analysis and insights
```bash
# Search logs with Elasticsearch
curl -X GET "elasticsearch:9200/docker-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"match": {"level": "ERROR"}},
          {"range": {"@timestamp": {"gte": "now-1h"}}}
        ]
      }
    }
  }'

# Kibana dashboards for visualization
# Create dashboards for:
# - Error rates over time
# - Response times by endpoint
# - Resource usage by service
# - User activity patterns
```

### 10. Compliance and auditing
```bash
# Enable audit logging
sudo auditctl -w /var/run/docker.sock -p rwxa -k docker-audit

# Collect audit logs
sudo ausearch -k docker-audit -i

# Compliance reporting
# Generate reports for:
# - Log retention compliance
# - Access logging
# - Security event logging
# - Data privacy compliance
```

## ❌ Incorrect: Log aggregation antipatterns

```bash
# ❌ No log aggregation
docker logs myapp > /tmp/logs.txt  # Manual collection

# ❌ Inconsistent log formats
# Some services JSON, others plain text

# ❌ No log retention policy
# Logs accumulating indefinitely

# ❌ No alerting on errors
# Silent failures in production
```

## Key Benefits
- **Centralized visibility**: All logs in one place
- **Real-time monitoring**: Immediate issue detection
- **Correlation analysis**: Connect events across services
- **Performance insights**: Resource usage and bottlenecks
- **Compliance**: Audit trails and retention
- **Proactive alerting**: Prevent issues before they impact users</content>
<parameter name="filePath">skills/docker-skill/rules/logging/logging-aggregation.md