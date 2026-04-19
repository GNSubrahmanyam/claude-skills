# Schema Naming Conventions
**Impact:** CRITICAL - Ensures consistent, predictable log field names across all services and environments

**Problem:**
Inconsistent field naming (camelCase vs snake_case, abbreviated vs full names, inconsistent prefixes) makes log querying, filtering, and analysis difficult. Teams waste time understanding field meanings and writing complex queries. Inconsistent naming leads to errors in log processing pipelines and monitoring dashboards.

**Solution:**
Establish standardized naming conventions for all log fields, following industry best practices and ensuring consistency across the entire logging ecosystem.

## ✅ Correct: Standardized naming conventions

### 1. Field naming principles
```json
{
  "timestamp": "2024-01-15T10:23:45.123Z",     // ISO 8601 format
  "level": "info",                             // lowercase severity
  "service": "user-service",                   // kebab-case for service names
  "environment": "production",                 // lowercase environment
  "version": "1.2.3",                          // semantic versioning
  "host": "web-01.prod.example.com",           // full hostname
  "correlation_id": "abc-123-def-456",         // UUID format with dashes
  "request_id": "req-789-xyz-000",             // prefixed identifiers
  "user_id": "usr_12345",                      // prefixed user identifiers
  "session_id": "sess_abc123",                 // prefixed session identifiers
  "trace_id": "trace_789xyz",                  // distributed trace identifier
  "span_id": "span_456def",                    // trace span identifier
  "component": "auth_handler",                 // snake_case for code components
  "operation": "user_login",                   // snake_case for operations
  "status_code": 200,                          // HTTP status codes
  "response_time_ms": 125.5,                   // milliseconds with _ms suffix
  "error_code": "VALIDATION_ERROR",            // UPPER_SNAKE_CASE for error codes
  "error_message": "Invalid email format",     // human-readable error message
  "client_ip": "192.168.1.100",                // IP addresses
  "user_agent": "Mozilla/5.0...",              // standard HTTP header names
  "request_size_bytes": 2048,                  // bytes with _bytes suffix
  "database_query_time_ms": 45.2,              // database timing
  "cache_hit": true,                           // boolean flags
  "retry_count": 2,                            // count of retries
  "feature_flag_enabled": false                // feature flag status
}
```

### 2. Naming patterns by category

#### Temporal fields
- `timestamp`: ISO 8601 timestamp (primary)
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp
- `expires_at`: Expiration timestamp
- `processed_at`: Processing completion timestamp

#### Identifiers
- `id`: Primary identifier (context-dependent)
- `correlation_id`: Cross-service correlation
- `request_id`: Individual request identifier
- `session_id`: User session identifier
- `user_id`: User identifier
- `trace_id`: Distributed trace identifier
- `span_id`: Trace span identifier

#### Performance metrics
- `duration_ms`: Duration in milliseconds
- `response_time_ms`: Response time in milliseconds
- `latency_ms`: Latency in milliseconds
- `query_time_ms`: Database query time
- `processing_time_ms`: Processing time
- `size_bytes`: Size in bytes
- `count`: Generic count
- `rate_per_second`: Rate per second

#### HTTP/Networking
- `method`: HTTP method (GET, POST, etc.)
- `url`: Full URL
- `path`: URL path
- `query_string`: Query parameters
- `status_code`: HTTP status code
- `content_type`: Content-Type header
- `content_length`: Content-Length header
- `user_agent`: User-Agent header
- `referer`: Referer header

#### Business context
- `action`: Business action performed
- `resource`: Resource being acted upon
- `resource_type`: Type of resource
- `resource_id`: Resource identifier
- `outcome`: Result of operation (success/failure)
- `reason`: Reason for outcome

#### Error context
- `error`: Error object/dictionary
- `error_type`: Type of error
- `error_code`: Error code
- `error_message`: Human-readable error message
- `stack_trace`: Error stack trace
- `root_cause`: Root cause of error

### 3. Case conventions

#### snake_case (preferred for most fields)
- `correlation_id`
- `request_id`
- `user_id`
- `response_time_ms`
- `error_message`
- `database_query_time_ms`

#### kebab-case (for service and component names)
- `user-service`
- `auth-service`
- `order-processor`
- `payment-gateway`

#### camelCase (only for legacy compatibility)
- `correlationId` (avoid, use snake_case)
- `requestId` (avoid, use snake_case)

#### UPPER_SNAKE_CASE (for constants and enums)
- `VALIDATION_ERROR`
- `AUTHENTICATION_FAILED`
- `INTERNAL_SERVER_ERROR`

### 4. Prefix conventions

#### Identifier prefixes
- `req_`: Request identifiers
- `usr_`: User identifiers
- `sess_`: Session identifiers
- `trace_`: Trace identifiers
- `span_`: Span identifiers
- `org_`: Organization identifiers

#### Business prefixes
- `order_`: Order-related fields
- `payment_`: Payment-related fields
- `product_`: Product-related fields
- `customer_`: Customer-related fields

### 5. Naming conventions by programming language

#### Python
```python
# Use snake_case for all identifiers
logger.info("Request processed", {
    "correlation_id": correlation_id,
    "request_id": request_id,
    "user_id": user_id,
    "response_time_ms": duration,
    "status_code": status_code
})
```

#### JavaScript/Node.js
```javascript
// Use camelCase for object keys (despite snake_case preference)
logger.info("Request processed", {
    correlationId: correlationId,  // camelCase for JS compatibility
    requestId: requestId,
    userId: userId,
    responseTimeMs: duration,      // camelCase
    statusCode: statusCode
});
```

#### Go
```go
// Use camelCase with JSON tags for snake_case output
type LogEntry struct {
    CorrelationID   string  `json:"correlation_id"`
    RequestID       string  `json:"request_id"`
    UserID          string  `json:"user_id"`
    ResponseTimeMs  float64 `json:"response_time_ms"`
    StatusCode      int     `json:"status_code"`
}
```

#### Java
```java
// Use camelCase with Jackson annotations
@Slf4j
public class LogEntry {
    @JsonProperty("correlation_id")
    private String correlationId;

    @JsonProperty("request_id")
    private String requestId;

    @JsonProperty("response_time_ms")
    private double responseTimeMs;
}
```

## ❌ Incorrect: Naming convention violations

```json
// ❌ Mixed case styles
{
  "correlationId": "abc-123",      // camelCase
  "request_id": "req-456",         // snake_case
  "userId": "usr-789",             // camelCase
  "ResponseTime": 125.5            // PascalCase
}

// ❌ Inconsistent prefixes
{
  "correlation_id": "abc-123",
  "requestId": "req-456",          // Mixed prefix usage
  "user_id": "usr-789",
  "sessionId": "sess-000"          // camelCase violation
}

// ❌ Abbreviated names
{
  "corr_id": "abc-123",            // Abbreviated
  "req_id": "req-456",             // Abbreviated
  "usr_id": "usr-789",             // Abbreviated
  "resp_time_ms": 125.5            // Abbreviated
}

// ❌ Generic names
{
  "id": "abc-123",                 // Too generic
  "time": 125.5,                   // Too generic
  "data": {...},                   // Too generic
  "result": "success"              // Too generic
}
```

## Key Benefits
- **Query consistency**: Standardized field names enable reliable log queries
- **Tool compatibility**: Consistent naming works with all log analysis tools
- **Team productivity**: Reduced time spent understanding field meanings
- **Pipeline reliability**: Predictable field names prevent processing errors
- **Documentation**: Self-documenting field names reduce maintenance burden</content>
<parameter name="filePath">skills/structured-json-logging-skill/rules/schema/schema-naming-conventions.md