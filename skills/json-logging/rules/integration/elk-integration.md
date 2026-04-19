# ELK Stack Integration for Log Aggregation
**Impact:** MEDIUM-HIGH - Enables centralized log management, search, and visualization for effective monitoring and troubleshooting

**Problem:**
Distributed logs scattered across multiple servers make debugging production issues extremely difficult. Manual log collection and analysis wastes developer time and leads to missed issues. Without centralized logging, teams cannot correlate events across services or identify system-wide patterns.

**Solution:**
Implement ELK stack (Elasticsearch, Logstash, Kibana) for comprehensive log aggregation, indexing, search, and visualization with structured JSON logging integration.

## ✅ Correct: ELK stack integration

### 1. Logstash configuration for structured JSON
```ruby
# logstash.conf - Pipeline configuration
input {
  # Filebeat input for application logs
  beats {
    port => 5044
    ssl => false
  }

  # HTTP input for direct JSON logging
  http {
    port => 8080
    codec => json
  }

  # Docker container logs
  docker {
    host => "unix:///var/run/docker.sock"
    containers => ["*"]
    tags => ["docker"]
  }
}

filter {
  # Parse JSON logs
  json {
    source => "message"
    target => "parsed_json"
    remove_field => ["message"]
  }

  # Handle different log formats
  if [parsed_json][level] {
    # Structured JSON logs
    mutate {
      rename => { "[parsed_json][timestamp]" => "timestamp" }
      rename => { "[parsed_json][level]" => "level" }
      rename => { "[parsed_json][service]" => "service" }
      rename => { "[parsed_json][message]" => "message" }
      rename => { "[parsed_json][correlation_id]" => "correlation_id" }
    }
  } else if "docker" in [tags] {
    # Docker logs
    json {
      source => "log"
      target => "docker_json"
    }
    mutate {
      add_field => { "service" => "%{container}[name]" }
      add_field => { "container_id" => "%{container}[id]" }
    }
  }

  # Add metadata
  mutate {
    add_field => { "logstash_timestamp" => "%{@timestamp}" }
    add_field => { "host" => "%{host}" }
  }

  # GeoIP enrichment (optional)
  geoip {
    source => "client_ip"
    target => "geoip"
  }

  # Anonymize sensitive data
  mutate {
    gsub => [
      "message", '\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b', '****-****-****-****',
      "url", '(password|token|key)=[^&\s]*', '\1=***MASKED***'
    ]
  }

  # Parse timestamps
  date {
    match => ["timestamp", "ISO8601", "yyyy-MM-dd HH:mm:ss", "dd/MMM/yyyy:HH:mm:ss Z"]
    target => "@timestamp"
  }

  # Add tags for filtering
  if [level] == "ERROR" or [level] == "CRITICAL" {
    mutate { add_tag => ["error"] }
  }
  if [correlation_id] {
    mutate { add_tag => ["correlated"] }
  }
}

output {
  # Primary Elasticsearch output
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "logs-%{+YYYY.MM.dd}"
    document_type => "_doc"
    template_name => "logstash"
    template => "/etc/logstash/templates/logstash.json"
  }

  # Fallback stdout for debugging
  if "_debug" in [tags] {
    stdout {
      codec => rubydebug
    }
  }
}
```

### 2. Elasticsearch index template
```json
// PUT _template/logs_template
{
  "index_patterns": ["logs-*"],
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1,
    "refresh_interval": "30s",
    "index.codec": "best_compression"
  },
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "timestamp": {
        "type": "date",
        "format": "strict_date_optional_time||yyyy-MM-dd HH:mm:ss||epoch_millis"
      },
      "level": {
        "type": "keyword"
      },
      "service": {
        "type": "keyword"
      },
      "message": {
        "type": "text",
        "analyzer": "standard"
      },
      "correlation_id": {
        "type": "keyword",
        "index": true
      },
      "request_id": {
        "type": "keyword"
      },
      "user_id": {
        "type": "keyword"
      },
      "trace_id": {
        "type": "keyword"
      },
      "span_id": {
        "type": "keyword"
      },
      "host": {
        "type": "keyword"
      },
      "process_id": {
        "type": "long"
      },
      "thread_id": {
        "type": "keyword"
      },
      "client_ip": {
        "type": "ip"
      },
      "status_code": {
        "type": "integer"
      },
      "response_time_ms": {
        "type": "float"
      },
      "error": {
        "properties": {
          "type": {
            "type": "keyword"
          },
          "message": {
            "type": "text"
          },
          "stack_trace": {
            "type": "text"
          },
          "code": {
            "type": "keyword"
          }
        }
      },
      "http": {
        "properties": {
          "method": {
            "type": "keyword"
          },
          "url": {
            "type": "text"
          },
          "status_code": {
            "type": "integer"
          },
          "user_agent": {
            "type": "text"
          },
          "referer": {
            "type": "keyword"
          }
        }
      },
      "business": {
        "properties": {
          "user_id": {
            "type": "keyword"
          },
          "action": {
            "type": "keyword"
          },
          "resource": {
            "type": "keyword"
          },
          "outcome": {
            "type": "keyword"
          },
          "amount": {
            "type": "float"
          },
          "currency": {
            "type": "keyword"
          }
        }
      }
    }
  }
}
```

### 3. Kibana dashboards and visualizations
```json
// Kibana saved search for error logs
{
  "attributes": {
    "title": "Error Logs",
    "description": "",
    "hits": 0,
    "columns": [
      "@timestamp",
      "service",
      "level",
      "message",
      "correlation_id"
    ],
    "sort": ["@timestamp", "desc"],
    "version": 1,
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": {
        "index": "logs-*",
        "filter": [
          {
            "query": {
              "match": {
                "level": "ERROR"
              }
            }
          }
        ],
        "query": {
          "query": "",
          "language": "lucene"
        }
      }
    }
  }
}
```

### 4. Filebeat configuration for log shipping
```yaml
# filebeat.yml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/application/*.json
  json:
    keys_under_root: true
    overwrite_keys: true
    add_error_key: true
  fields:
    service: my-application
    environment: production

- type: docker
  containers.ids: ["*"]
  processors:
  - add_docker_metadata:
      host: "unix:///var/run/docker.sock"

output.logstash:
  hosts: ["logstash:5044"]
  ssl:
    certificate_authorities: ["/etc/ssl/certs/ca.pem"]
    certificate: "/etc/ssl/certs/filebeat.crt"
    key: "/etc/ssl/private/filebeat.key"

processors:
- add_host_metadata:
    when.not.contains.tags: forwarded
- add_cloud_metadata: ~
- add_docker_metadata: ~
- add_kubernetes_metadata: ~
```

### 5. Docker Compose ELK stack
```yaml
version: '3.8'

services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
      - xpack.monitoring.enabled=false
    volumes:
      - es_data:/usr/share/elasticsearch/data
      - ./elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml
    ports:
      - "9200:9200"
      - "9300:9300"
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
      - "8080:8080"
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
      - XPACK_SECURITY_ENABLED=false
    depends_on:
      - elasticsearch

  filebeat:
    image: elastic/filebeat:8.11.0
    user: root
    volumes:
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - setup.kibana.host=kibana:5601
      - setup.ilm.enabled=false
    depends_on:
      - logstash
      - kibana

volumes:
  es_data:
```

### 6. Application integration with ELK
```python
import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
import requests

class ELKHandler(logging.Handler):
    """Custom logging handler that sends logs to Logstash"""

    def __init__(self, logstash_url: str = "http://logstash:8080"):
        super().__init__()
        self.logstash_url = logstash_url

    def emit(self, record):
        """Send log record to Logstash"""
        try:
            log_entry = self.format_record(record)
            requests.post(
                self.logstash_url,
                json=log_entry,
                timeout=5
            )
        except Exception:
            # Don't let logging errors crash the application
            pass

    def format_record(self, record) -> Dict[str, Any]:
        """Format log record as JSON"""
        return {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "process_id": record.process,
            "thread_id": record.thread,
            "service": getattr(record, 'service', 'unknown'),
            "environment": getattr(record, 'environment', 'unknown'),
            "correlation_id": getattr(record, 'correlation_id', None),
            "request_id": getattr(record, 'request_id', None),
            "user_id": getattr(record, 'user_id', None),
            "extra": getattr(record, 'extra', {}),
        }

# Configure logging with ELK handler
logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.StreamHandler(),  # Console output
        ELKHandler()  # ELK integration
    ]
)

# Usage
logger = logging.getLogger(__name__)
logger.info("Application started", extra={
    "service": "my-app",
    "environment": "production",
    "correlation_id": "abc-123"
})
```

### 7. Kibana queries and visualizations
```json
// Example Kibana queries
{
  "error_rate": {
    "query": {
      "bool": {
        "must": [
          {"term": {"level": "ERROR"}},
          {"range": {"@timestamp": {"gte": "now-1h"}}}
        ]
      }
    },
    "aggs": {
      "errors_per_minute": {
        "date_histogram": {
          "field": "@timestamp",
          "fixed_interval": "1m"
        }
      }
    }
  },

  "slow_requests": {
    "query": {
      "bool": {
        "must": [
          {"exists": {"field": "response_time_ms"}},
          {"range": {"response_time_ms": {"gte": 5000}}}
        ]
      }
    },
    "sort": [{"response_time_ms": "desc"}]
  },

  "correlation_search": {
    "query": {
      "term": {"correlation_id": "abc-123-def"}
    },
    "sort": [{"@timestamp": "asc"}]
  }
}
```

### 8. Alerting and monitoring
```json
// Elasticsearch Watcher alert
{
  "trigger": {
    "schedule": {
      "interval": "5m"
    }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["logs-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                {"term": {"level": "ERROR"}},
                {"range": {"@timestamp": {"gte": "now-5m"}}}
              ]
            }
          },
          "aggs": {
            "error_count": {
              "value_count": {
                "field": "level"
              }
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.aggregations.error_count.value": {
        "gt": 10
      }
    }
  },
  "actions": {
    "slack_notification": {
      "slack": {
        "account": "monitoring",
        "message": {
          "text": "High error rate detected: {{ctx.payload.aggregations.error_count.value}} errors in last 5 minutes"
        }
      }
    }
  }
}
```

### 9. Log retention and lifecycle management
```json
// ILM (Index Lifecycle Management) policy
PUT _ilm/policy/logs_lifecycle
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

## ❌ Incorrect: ELK integration mistakes

```python
# ❌ Sending logs synchronously
logger.info("Request processed")  # Blocks request processing

# ❌ Not handling ELK failures
requests.post("http://logstash:8080", json=log_data)  # No error handling

# ❌ Overwhelming Elasticsearch
# Sending every debug log to ELK
logger.debug("Variable x = 5", extra={"all_vars": locals()})

# ❌ No log sampling
# Sending millions of identical logs
for item in million_items:
    logger.info("Processing item", item_id=item.id)

# ❌ No index management
# Single index grows infinitely
```

## Key Benefits
- **Centralized logging**: All logs in one searchable location
- **Advanced search**: Query by any field with full-text search
- **Real-time monitoring**: Live dashboards and alerts
- **Scalability**: Handle millions of logs per day
- **Correlation**: Link logs across services and requests
- **Retention policies**: Automatic data lifecycle management
- **Visualization**: Rich dashboards and reporting
- **Alerting**: Proactive issue detection and notification</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/integration/elk-integration.md