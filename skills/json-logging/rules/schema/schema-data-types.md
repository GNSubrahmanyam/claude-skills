# Schema Data Types
**Impact:** CRITICAL - Ensures proper data typing for reliable log parsing, querying, and analysis

**Problem:**
Inconsistent or incorrect data types in log fields cause parsing failures, incorrect query results, and analysis errors. String representations of numbers, dates, and booleans make it impossible to perform mathematical operations, range queries, or aggregations. Type mismatches lead to silent failures in log processing pipelines and monitoring systems.

**Solution:**
Define explicit data types for all log fields with proper validation and conversion rules to ensure data integrity and queryability.

## ✅ Correct: Proper data type usage

### 1. Core data types and their usage

#### String (text) fields
```json
{
  "correlation_id": "abc-123-def-456",     // UUID strings
  "request_id": "req-789-xyz-000",         // Prefixed identifiers
  "user_id": "usr_12345",                  // User identifiers
  "service": "user-service",               // Service names
  "environment": "production",             // Environment names
  "level": "info",                         // Log levels (lowercase)
  "message": "User login successful",      // Human-readable messages
  "component": "auth_handler",             // Code component names
  "operation": "user_login",               // Operation names
  "error_message": "Invalid credentials",  // Error descriptions
  "user_agent": "Mozilla/5.0...",          // HTTP headers
  "url": "https://api.example.com/users",  // URLs
  "path": "/api/v1/users",                 // URL paths
  "method": "POST",                        // HTTP methods
  "content_type": "application/json",      // MIME types
  "client_ip": "192.168.1.100",            // IP addresses as strings
  "host": "web-01.prod.example.com",       // Hostnames
  "version": "1.2.3",                      // Version strings
  "error_code": "VALIDATION_ERROR",        // Error codes
  "outcome": "success",                    // Operation outcomes
  "resource_type": "user",                 // Resource types
  "action": "create"                       // Actions performed
}
```

#### Numeric fields
```json
{
  "status_code": 200,                      // HTTP status codes (integer)
  "response_time_ms": 125.5,               // Response time (float)
  "latency_ms": 45.2,                      // Latency (float)
  "duration_ms": 89.7,                     // Duration (float)
  "size_bytes": 2048,                      // Size in bytes (integer)
  "request_size_bytes": 1024,              // Request size (integer)
  "retry_count": 2,                        // Retry attempts (integer)
  "attempt_number": 1,                     // Attempt number (integer)
  "batch_size": 100,                       // Batch size (integer)
  "queue_length": 25,                      // Queue length (integer)
  "active_connections": 150,               // Connection count (integer)
  "memory_usage_mb": 256.5,                // Memory usage (float)
  "cpu_usage_percent": 75.2,               // CPU usage (float)
  "error_rate_percent": 2.5,               // Error rate (float)
  "success_rate_percent": 97.5,            // Success rate (float)
  "throughput_per_second": 150.8,          // Throughput (float)
  "response_size_kb": 45.2                 // Response size (float)
}
```

#### Boolean fields
```json
{
  "cache_hit": true,                       // Cache hit status
  "authenticated": true,                   // Authentication status
  "authorized": false,                     // Authorization status
  "success": true,                         // Operation success
  "completed": true,                       // Operation completion
  "retried": false,                        // Retry performed
  "fallback_used": false,                  // Fallback mechanism used
  "circuit_breaker_open": false,           // Circuit breaker status
  "feature_flag_enabled": true,            // Feature flag status
  "debug_mode": false,                     // Debug mode status
  "test_mode": false                       // Test mode status
}
```

#### Date/Time fields
```json
{
  "timestamp": "2024-01-15T10:23:45.123Z",  // ISO 8601 primary timestamp
  "created_at": "2024-01-15T10:23:45.123Z", // Creation time
  "updated_at": "2024-01-15T10:25:30.456Z", // Update time
  "expires_at": "2024-01-15T11:23:45.123Z", // Expiration time
  "processed_at": "2024-01-15T10:24:00.000Z", // Processing time
  "started_at": "2024-01-15T10:23:40.000Z",  // Start time
  "finished_at": "2024-01-15T10:24:05.123Z"  // Finish time
}
```

#### Array/Object fields
```json
{
  "tags": ["auth", "login", "user"],       // String array
  "metadata": {                            // Object for additional context
    "source": "web",
    "browser": "chrome",
    "version": "120.0"
  },
  "error": {                               // Error object
    "type": "ValidationError",
    "code": "INVALID_EMAIL",
    "message": "Email format is invalid",
    "field": "email"
  },
  "http": {                                // HTTP context object
    "method": "POST",
    "url": "/api/login",
    "status_code": 400,
    "response_time_ms": 125.5
  },
  "database": {                            // Database context
    "operation": "SELECT",
    "table": "users",
    "query_time_ms": 45.2,
    "rows_affected": 1
  },
  "performance": {                         // Performance metrics
    "cpu_percent": 75.2,
    "memory_mb": 256.5,
    "disk_io_mb": 12.3
  }
}
```

### 2. Data type validation rules

#### String validation
- UUID format: `"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"`
- Email format: Basic email regex validation
- URL format: Valid URL structure
- IP address: IPv4/IPv6 format
- Hostname: Valid hostname format
- Version: Semantic versioning (x.y.z)

#### Numeric validation
- Positive integers: `>= 0`
- Percentages: `0.0 <= value <= 100.0`
- Response times: `>= 0.0`
- File sizes: `>= 0`
- Port numbers: `1 <= value <= 65535`

#### Date/Time validation
- ISO 8601 format: `"YYYY-MM-DDTHH:mm:ss.sssZ"`
- Valid date ranges: Not in future for past events
- Chronological order: `started_at <= finished_at`

### 3. Type conversion guidelines

#### String to numeric conversion
```python
# Safe numeric conversion
def safe_to_int(value, default=0):
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return default

def safe_to_float(value, default=0.0):
    try:
        return float(value)
    except (ValueError, TypeError):
        return default

# Usage
status_code = safe_to_int(log_entry.get('status_code'))
response_time = safe_to_float(log_entry.get('response_time_ms'))
```

#### String to boolean conversion
```python
# Safe boolean conversion
def safe_to_bool(value, default=False):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    if isinstance(value, (int, float)):
        return value != 0
    return default

# Usage
cache_hit = safe_to_bool(log_entry.get('cache_hit'))
success = safe_to_bool(log_entry.get('success'))
```

#### Timestamp parsing
```python
import datetime
from dateutil import parser

def parse_timestamp(ts_string, default=None):
    if not ts_string:
        return default
    try:
        # Parse ISO 8601 format
        return parser.isoparse(ts_string)
    except (ValueError, TypeError):
        return default

# Usage
timestamp = parse_timestamp(log_entry.get('timestamp'))
```

### 4. Schema enforcement

#### JSON Schema validation
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "level": {
      "type": "string",
      "enum": ["debug", "info", "warning", "error", "critical"]
    },
    "correlation_id": {
      "type": "string",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    },
    "status_code": {
      "type": "integer",
      "minimum": 100,
      "maximum": 599
    },
    "response_time_ms": {
      "type": "number",
      "minimum": 0
    },
    "success": {
      "type": "boolean"
    }
  },
  "required": ["timestamp", "level", "message"]
}
```

#### Runtime type checking
```python
from typing import Dict, Any, Union
import json

def validate_log_entry(entry: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and normalize log entry data types"""
    validated = {}

    # String fields
    string_fields = ['correlation_id', 'request_id', 'user_id', 'service', 'level', 'message']
    for field in string_fields:
        value = entry.get(field)
        if value is not None:
            validated[field] = str(value)

    # Integer fields
    int_fields = ['status_code', 'retry_count', 'size_bytes']
    for field in int_fields:
        value = entry.get(field)
        if value is not None:
            try:
                validated[field] = int(float(value))
            except (ValueError, TypeError):
                pass  # Skip invalid values

    # Float fields
    float_fields = ['response_time_ms', 'latency_ms', 'duration_ms']
    for field in float_fields:
        value = entry.get(field)
        if value is not None:
            try:
                validated[field] = float(value)
            except (ValueError, TypeError):
                pass

    # Boolean fields
    bool_fields = ['cache_hit', 'authenticated', 'success']
    for field in bool_fields:
        value = entry.get(field)
        if isinstance(value, bool):
            validated[field] = value
        elif isinstance(value, str):
            validated[field] = value.lower() in ('true', '1', 'yes')

    return validated
```

## ❌ Incorrect: Data type violations

```json
// ❌ Numeric values as strings
{
  "status_code": "200",           // Should be integer
  "response_time_ms": "125.5",    // Should be number
  "retry_count": "2"              // Should be integer
}

// ❌ Boolean values as strings
{
  "cache_hit": "true",            // Should be boolean
  "success": "false",             // Should be boolean
  "authenticated": "1"            // Should be boolean
}

// ❌ Inconsistent timestamp formats
{
  "timestamp": "2024/01/15 10:23:45",    // Not ISO 8601
  "created_at": "Jan 15, 2024 10:23 AM", // Not standard format
  "processed_at": 1705314225             // Unix timestamp as number
}

// ❌ Complex objects where primitives expected
{
  "status_code": {"code": 200, "text": "OK"},  // Should be integer
  "success": {"result": true, "confidence": 0.95}  // Should be boolean
}
```

## Key Benefits
- **Query accuracy**: Proper types enable mathematical and range queries
- **Performance**: Correct types improve indexing and search performance
- **Tool compatibility**: Standard types work with all log analysis tools
- **Data integrity**: Type validation prevents corrupt log data
- **Analysis reliability**: Proper types enable accurate aggregations and statistics</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/schema/schema-data-types.md