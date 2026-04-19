# Logging Framework Comparison and Selection Guide

## Overview

Choosing the right structured logging framework depends on your programming language, performance requirements, ecosystem integration, and operational needs. This guide compares popular structured logging frameworks across different languages.

## Python Frameworks

### structlog ⭐ Recommended

**Best for**: Production Python applications requiring advanced structured logging

**Key Features**:
- Native structured logging with context propagation
- Extensible processor pipeline
- Seamless integration with standard logging
- Rich ecosystem of processors and formatters

**Pros**:
- Excellent context management
- Highly customizable processors
- JSON output by default
- Good performance
- Active community

**Cons**:
- Learning curve for complex configurations
- Requires understanding of processor pipeline

**Configuration Example**:
```python
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()
logger.info("User login", user_id="123", correlation_id="abc-123")
```

**Use Case**: Django, FastAPI, Flask applications

### logging (Standard Library) + jsonlogger

**Best for**: Simple applications needing basic JSON output

**Key Features**:
- Standard library, no external dependencies
- jsonlogger adds JSON formatting
- Familiar logging interface

**Pros**:
- Zero external dependencies
- Standard Python logging interface
- Easy to adopt

**Cons**:
- Limited structured features
- Manual context management
- Less flexible than structlog

**Configuration Example**:
```python
import logging
from pythonjsonlogger import jsonlogger

logger = logging.getLogger()
handler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    '%(timestamp)s %(levelname)s %(name)s %(message)s'
)
handler.setFormatter(formatter)
logger.addHandler(handler)

logger.info("User login", extra={'user_id': '123', 'correlation_id': 'abc-123'})
```

**Use Case**: Simple scripts, small applications

## JavaScript/Node.js Frameworks

### Winston ⭐ Recommended

**Best for**: Node.js applications with complex logging requirements

**Key Features**:
- Multiple transports (console, file, HTTP, databases)
- Built-in JSON formatting
- Log levels and filtering
- Extensible with custom transports

**Pros**:
- Rich transport ecosystem
- Good performance
- Built-in JSON support
- Enterprise-ready features

**Cons**:
- Can be complex for simple use cases
- Transport configuration overhead

**Configuration Example**:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'ISO' }),
    winston.format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

logger.info('User login', { user_id: '123', correlation_id: 'abc-123' });
```

**Use Case**: Express.js, NestJS, enterprise Node.js applications

### Pino

**Best for**: High-performance Node.js applications

**Key Features**:
- Extremely fast JSON logging
- Child loggers for context
- Built-in serializers
- Low overhead

**Pros**:
- Excellent performance
- Simple API
- Good for high-throughput applications

**Cons**:
- Fewer transport options than Winston
- Less enterprise features

**Configuration Example**:
```javascript
const pino = require('pino');

const logger = pino({
  level: 'info',
  base: { service: 'user-service' },
  timestamp: pino.stdTimeFunctions.isoTime
});

logger.info({ user_id: '123', correlation_id: 'abc-123' }, 'User login');
```

**Use Case**: High-performance APIs, microservices

### Bunyan

**Best for**: Legacy Node.js applications

**Key Features**:
- JSON output by default
- Child loggers
- Multiple streams
- Good for debugging

**Pros**:
- Mature and stable
- Good debugging features

**Cons**:
- Less active development
- Fewer modern features

## Go Frameworks

### logrus ⭐ Recommended

**Best for**: Go applications requiring structured logging

**Key Features**:
- JSON formatting by default
- Fields and context
- Hooks system
- Multiple log levels

**Pros**:
- Widely adopted in Go ecosystem
- Good performance
- Extensible hooks

**Cons**:
- Not as fast as zap for high-throughput
- Less feature-rich than zap

**Configuration Example**:
```go
package main

import (
    "github.com/sirupsen/logrus"
)

func init() {
    logrus.SetFormatter(&logrus.JSONFormatter{
        TimestampFormat: "2006-01-02T15:04:05.000Z07:00",
    })
    logrus.SetLevel(logrus.InfoLevel)
}

func main() {
    logrus.WithFields(logrus.Fields{
        "user_id": "123",
        "correlation_id": "abc-123",
    }).Info("User login")
}
```

**Use Case**: Standard Go applications, Kubernetes operators

### zap

**Best for**: High-performance Go applications

**Key Features**:
- Extremely fast structured logging
- Type-safe logging
- Sampling and rate limiting
- Built-in development vs production modes

**Pros**:
- Best performance in Go
- Type safety
- Excellent for production

**Cons**:
- More complex API
- Learning curve

**Configuration Example**:
```go
package main

import (
    "go.uber.org/zap"
)

func main() {
    logger, _ := zap.NewProduction()
    defer logger.Sync()

    logger.Info("User login",
        zap.String("user_id", "123"),
        zap.String("correlation_id", "abc-123"),
    )
}
```

**Use Case**: High-throughput services, performance-critical applications

## Java Frameworks

### Logback with Jackson

**Best for**: Enterprise Java applications

**Key Features**:
- JSON layout with Jackson
- SLF4J compatibility
- Advanced filtering and routing
- Enterprise features

**Pros**:
- Mature and stable
- Enterprise-grade features
- Good performance

**Cons**:
- XML configuration can be complex
- Heavier than simpler frameworks

**Configuration Example**:
```xml
<!-- logback.xml -->
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <fieldNames>
                <timestamp>timestamp</timestamp>
                <level>level</level>
                <levelValue>level_value</levelValue>
                <message>message</message>
                <logger>logger</logger>
            </fieldNames>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="JSON" />
    </root>
</configuration>
```

**Usage**:
```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    public void login(String userId, String correlationId) {
        logger.info("User login successful", kv("user_id", userId), kv("correlation_id", correlationId));
    }
}
```

## .NET Frameworks

### Serilog ⭐ Recommended

**Best for**: .NET applications requiring structured logging

**Key Features**:
- Rich structured logging
- Sinks ecosystem (console, file, databases, cloud services)
- Enrichers for automatic context
- Excellent performance

**Pros**:
- Best-in-class structured logging for .NET
- Rich sink ecosystem
- Good performance
- Active community

**Cons**:
- More complex than Microsoft.Extensions.Logging

**Configuration Example**:
```csharp
using Serilog;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.WithProperty("service", "user-service")
    .Enrich.WithProperty("environment", "production")
    .WriteTo.Console(new CompactJsonFormatter())
    .CreateLogger();

Log.Information("User login successful {@UserData}",
    new { user_id = "123", correlation_id = "abc-123" });
```

**Use Case**: ASP.NET Core, enterprise .NET applications

### Microsoft.Extensions.Logging

**Best for**: Simple .NET applications

**Key Features**:
- Built into .NET Core
- Provider model for different outputs
- Structured logging support

**Pros**:
- Built-in, no external dependencies
- Familiar API

**Cons**:
- Limited structured features compared to Serilog
- Fewer output options

## Selection Criteria

### Choose Based on Language & Requirements

| Language | Recommended | High Performance | Simple Use Case |
|----------|-------------|------------------|-----------------|
| Python | structlog | structlog | logging + jsonlogger |
| JavaScript | Winston | Pino | Winston |
| Go | logrus | zap | logrus |
| Java | Logback | Logback | Logback |
| .NET | Serilog | Serilog | Microsoft.Extensions.Logging |

### Performance Comparison

**Requests per second (higher is better)**:

- **Go**: zap (500k) > logrus (300k)
- **Python**: structlog (50k) > standard logging (40k)
- **Node.js**: Pino (100k) > Winston (80k)
- **Java**: Logback (150k)
- **.NET**: Serilog (200k)

### Ecosystem Integration

**Cloud Platforms**:
- **AWS**: All frameworks have good CloudWatch integration
- **GCP**: Winston, Serilog have native integrations
- **Azure**: Serilog has excellent Azure integration

**Monitoring Tools**:
- **ELK Stack**: All JSON frameworks work well
- **Datadog**: Winston, Serilog have direct integrations
- **New Relic**: Most frameworks supported

### Migration Considerations

**From unstructured logging**:
1. Start with JSON formatter on existing framework
2. Gradually add structured fields
3. Update monitoring queries
4. Add correlation IDs
5. Implement context propagation

**Team adoption**:
- Choose framework with good documentation
- Provide training and examples
- Start with simple use cases
- Gradually adopt advanced features

## Configuration Templates

### Development vs Production

**Development**:
- Human-readable format (colors, pretty printing)
- Debug level logging
- Console output
- Include stack traces

**Production**:
- JSON format
- Info level and above
- File/network output
- Structured error information
- Performance optimization

### Environment-Specific Configuration

```python
# Python example
import os

def configure_logging():
    environment = os.getenv('ENVIRONMENT', 'development')

    if environment == 'production':
        return {
            'level': 'INFO',
            'format': 'json',
            'output': 'file',
            'file': '/var/log/app.log'
        }
    else:
        return {
            'level': 'DEBUG',
            'format': 'console_pretty',
            'output': 'console'
        }
```

## Best Practices Across Frameworks

1. **Consistent Schema**: Use same field names across services
2. **Correlation IDs**: Include in every log entry
3. **Structured Context**: Avoid string interpolation
4. **Performance**: Use async logging for high-throughput
5. **Security**: Sanitize sensitive data
6. **Monitoring**: Integrate with centralized logging systems
7. **Testing**: Test logging in unit tests
8. **Documentation**: Document log schema and fields

## Summary

**Recommended Frameworks by Language**:
- **Python**: structlog (flexibility, context management)
- **JavaScript**: Winston (ecosystem, enterprise features)
- **Go**: logrus (adoption, ease of use) or zap (performance)
- **Java**: Logback (enterprise, stability)
- **.NET**: Serilog (structured logging, ecosystem)

Choose based on:
1. **Language ecosystem** and community support
2. **Performance requirements** for your use case
3. **Integration needs** with existing infrastructure
4. **Team experience** and learning curve
5. **Enterprise features** needed

All recommended frameworks support structured JSON logging and can integrate with ELK stack, monitoring tools, and cloud platforms.</content>
<parameter name="filePath">skills/structured-json-logging-skill/references/framework-comparison.md