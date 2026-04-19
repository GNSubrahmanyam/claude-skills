# Structured JSON Logging Best Practices - Complete Rules Reference

This document compiles all rules from the Structured JSON Logging Best Practices framework, organized by impact priority for comprehensive structured logging implementation guidance.

---

## 1. Schema Design (CRITICAL)

### Base Log Schema Fields
**Impact:** CRITICAL - Ensures consistent, queryable log structure across all services and environments

**Problem:**
Inconsistent log formats make it impossible to correlate events, query logs effectively, or build reliable monitoring systems. Without standardized fields, log analysis becomes manual and error-prone, leading to missed issues and poor observability.

**Solution:**
Define and enforce a comprehensive base schema with standardized fields for all log entries, ensuring consistency across services, environments, and teams.

❌ **Wrong: Inconsistent field usage**
```json
// Service A
{
  "time": "2024-01-15T10:23:45.123Z",
  "lvl": "INFO",
  "msg": "User login successful",
  "userId": "12345"
}

// Service B
{
  "timestamp": "2024-01-15T10:23:45.123Z",
  "level": "info",
  "message": "User login successful",
  "user_id": "12345"
}
```

✅ **Correct: Standardized schema**
```json
{
  "timestamp": "2024-01-15T10:23:45.123Z",
  "level": "info",
  "service": "auth-service",
  "environment": "production",
  "version": "1.2.3",
  "message": "User login successful",
  "correlation_id": "abc-123-def-456",
  "user_id": "12345",
  "request_id": "req-789-xyz-000",
  "host": "web-01.prod.example.com",
  "process_id": 1234,
  "thread_id": "MainThread"
}
```

---

## 2. Framework Setup (CRITICAL)

### Python Structured Logging with Structlog
**Impact:** CRITICAL - Enables production-ready structured JSON logging in Python applications

**Problem:**
Python's default logging module produces unstructured text logs that are difficult to parse, search, and analyze. Without structured logging, debugging production issues becomes time-consuming and error-prone.

**Solution:**
Implement structlog for comprehensive structured JSON logging with automatic context propagation, flexible processors, and seamless integration with Python's logging ecosystem.

❌ **Wrong: Default logging**
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("User %s logged in from %s", user_id, ip_address)
# Output: User 123 logged in from 192.168.1.1
# Difficult to query or analyze
```

✅ **Correct: Structured logging with structlog**
```python
import structlog

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
logger.info("User login successful", user_id=user_id, ip_address=ip_address, correlation_id=corr_id)
# Output: {"timestamp": "2024-01-15T10:23:45.123Z", "level": "info", "user_id": "123", "ip_address": "192.168.1.1", "correlation_id": "abc-123"}
```

---

## 3. Contextual Logging (HIGH)

### Correlation IDs and Request Tracing
**Impact:** HIGH - Enables end-to-end request tracing across distributed systems and services

**Problem:**
In microservices architectures, a single user request spans multiple services. Without correlation IDs, it's impossible to trace requests across service boundaries, making debugging distributed issues extremely difficult and time-consuming.

**Solution:**
Implement correlation ID propagation across all services with automatic injection, context management, and tracing integration for comprehensive request observability.

❌ **Wrong: No correlation tracking**
```python
# Service A
logger.info("Processing payment", user_id=user_id, amount=amount)

# Service B (different request context)
logger.info("Payment processed", user_id=user_id, amount=amount)
# Cannot correlate these logs belong to the same user request
```

✅ **Correct: Correlation ID propagation**
```python
# Middleware sets correlation context
correlation_id = request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())

# Set context for this request
correlation_context.set(correlation_id=correlation_id, request_id=request_id)

# All logs in this request include correlation context
logger.info("Processing payment", user_id=user_id, amount=amount)
# Service B automatically includes same correlation_id
logger.info("Payment processed", user_id=user_id, amount=amount)

# Query: correlation_id:"abc-123-def" shows both logs
```

---

## 4. Security & Compliance (HIGH)

### Sensitive Data Protection in Logs
**Impact:** CRITICAL - Prevents security breaches and ensures compliance with data protection regulations

**Problem:**
Logs containing sensitive information like passwords, API keys, personal data, or financial information can lead to security breaches, data leaks, and compliance violations. Attackers often target logs to extract sensitive data, and accidental exposure can result in severe legal and financial consequences.

**Solution:**
Implement comprehensive data sanitization, masking, and filtering to prevent sensitive information from entering logs while maintaining debugging and monitoring capabilities.

❌ **Wrong: Logging sensitive data**
```python
logger.info("User authentication", user_id=user_id, password=user.password, api_key=api_key)
# Sensitive data exposed in logs!
```

✅ **Correct: Data sanitization**
```python
# Automatic sanitization
sensitive_data_filter = SensitiveDataFilter()

logger.info("User authentication",
           user_id=user_id,
           password="***MASKED***",  # Automatically sanitized
           api_key="***MASKED***",   # Automatically sanitized
           auth_method="password")

# Log shows: {"user_id": "123", "password": "***MASKED***", "api_key": "***MASKED***", "auth_method": "password"}
```

---

## 5. Performance Optimization (MEDIUM-HIGH)

### Log Buffering and Async Processing
**Impact:** MEDIUM-HIGH - Prevents logging from blocking application performance

**Problem:**
Synchronous logging can block application threads, especially when writing to slow destinations like network services or files. This can significantly impact application performance and user experience.

**Solution:**
Implement log buffering and asynchronous processing to prevent logging from blocking application operations while ensuring log delivery reliability.

❌ **Wrong: Synchronous logging bottleneck**
```python
# Every log call blocks the application thread
logger.info("Request processed", data=large_data_structure)
# Application waits for log write to complete
```

✅ **Correct: Buffered async logging**
```python
# Log buffer accumulates entries
log_buffer.add({
    "timestamp": datetime.utcnow().isoformat(),
    "level": "info",
    "message": "Request processed",
    "data": large_data_structure,
    "correlation_id": get_correlation_id()
})

# Async worker processes buffer in background
async def process_log_buffer():
    while True:
        entries = log_buffer.flush()
        if entries:
            await bulk_send_to_elk(entries)  # Non-blocking
        await asyncio.sleep(0.1)
```

---

## 6. Integration & Monitoring (MEDIUM-HIGH)

### ELK Stack Integration for Log Aggregation
**Impact:** MEDIUM-HIGH - Enables centralized log management, search, and visualization for effective monitoring and troubleshooting

**Problem:**
Distributed logs scattered across multiple servers make debugging production issues extremely difficult. Manual log collection and analysis wastes developer time and leads to missed issues. Without centralized logging, teams cannot correlate events across services or identify system-wide patterns.

**Solution:**
Implement ELK stack (Elasticsearch, Logstash, Kibana) for comprehensive log aggregation, indexing, search, and visualization with structured JSON logging integration.

❌ **Wrong: Scattered log files**
```bash
# Manual log analysis
grep "ERROR" /var/log/app1/*.log
grep "ERROR" /var/log/app2/*.log
grep "ERROR" /var/log/app3/*.log
# Time-consuming, error-prone, misses correlations
```

✅ **Correct: Centralized ELK aggregation**
```bash
# All logs searchable in one place
# Kibana query: level:ERROR AND correlation_id:"abc-123"
# Shows correlated errors across all services
# Dashboard: Error rate trends, top error types, service health
```

---

## 7. Migration & Adoption (MEDIUM)

### Gradual Migration from Unstructured Logging
**Impact:** MEDIUM - Enables smooth transition to structured logging without disrupting operations

**Problem:**
Migrating from unstructured text logging to structured JSON logging across large codebases can be disruptive and risky. Teams need to migrate incrementally without breaking existing monitoring or introducing performance issues.

**Solution:**
Implement gradual migration strategies with backward compatibility, feature flags, and phased rollouts to ensure smooth adoption of structured logging.

✅ **Correct: Phased migration approach**
```python
# Phase 1: Dual logging (structured + unstructured)
import logging
import structlog

# Keep existing logging
legacy_logger = logging.getLogger(__name__)

# Add structured logging alongside
structured_logger = structlog.get_logger()

def log_with_both(message, **kwargs):
    # Legacy format for existing monitoring
    legacy_logger.info(message, **kwargs)

    # Structured format for new monitoring
    structured_logger.info(message, **kwargs)

# Phase 2: Feature flags for gradual rollout
if os.getenv('STRUCTURED_LOGGING_ENABLED', 'false').lower() == 'true':
    # Use structured logging
    logger = structured_logger
else:
    # Use legacy logging
    logger = legacy_logger

# Phase 3: Complete migration
# Remove legacy logging, use only structured
logger = structured_logger
```

---

*Structured JSON Logging enables machine-readable, queryable logs for effective observability, monitoring, and debugging in distributed systems. Follow these patterns for enterprise-grade logging infrastructure.*</content>
<parameter name="filePath">skills/structured-json-logging-skill/AGENTS.md