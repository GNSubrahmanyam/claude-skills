---
name: structured-json-logging-best-practices
description: Comprehensive structured JSON logging framework with schema design, implementation patterns, security considerations, and enterprise best practices for observability and monitoring
---

# Structured JSON Logging Best Practices

Comprehensive framework for implementing structured JSON logging across applications, covering schema design, framework setup, contextual logging, security, performance optimization, and enterprise integration patterns. Enables machine-readable logs for effective monitoring, debugging, and observability in distributed systems.

## When to Apply

Reference these guidelines when:
- Implementing logging in new applications or services
- Migrating from unstructured text logging to structured formats
- Setting up centralized logging and monitoring systems
- Designing log schemas for microservices architectures
- Implementing observability and tracing in distributed systems
- Establishing logging standards across development teams
- Optimizing log performance and storage efficiency
- Ensuring log security and compliance requirements
- Integrating logs with monitoring and alerting systems

## Rule Categories by Priority

| Priority | Category | Impact | Files | Rules |
| --- | --- | --- | --- | --- |
| 1 | Schema Design | CRITICAL | 3 | 9 |
| 2 | Framework Setup | CRITICAL | 3 | 9 |
| 3 | Contextual Logging | HIGH | 3 | 8 |
| 4 | Security & Compliance | HIGH | 2 | 7 |
| 5 | Performance Optimization | MEDIUM-HIGH | 2 | 5 |
| 6 | Integration & Monitoring | MEDIUM-HIGH | 2 | 4 |
| 7 | Migration & Adoption | MEDIUM | 1 | 3 |
| **Total** | **7 Categories** | | **12 Files** | **45 Rules** |

## Quick Reference

### 1. Schema Design (CRITICAL)
- `schema-base-fields`: Standard fields for all log entries
- `schema-naming-conventions`: Consistent field naming patterns
- `schema-data-types`: Appropriate data types for different values
- `schema-contextual-fields`: Request and trace correlation
- `schema-custom-fields`: Application-specific field definitions
- `schema-validation`: Schema validation and enforcement

### 2. Framework Setup (CRITICAL)
- `python-structlog`: Python structured logging with structlog
- `python-json-logger`: Python JSON logging with python-json-logger
- `javascript-winston`: Node.js structured logging with Winston
- `go-logrus`: Go structured logging with logrus
- `java-logback`: Java structured logging with Logback
- `dotnet-serilog`: .NET structured logging with Serilog
- `fastapi-logging`: FastAPI structured logging integration
- `django-logging`: Django structured logging integration
- `express-logging`: Express.js structured logging middleware

### 3. Contextual Logging (HIGH)
- `correlation-ids`: Request and trace ID propagation
- `user-context`: User and session context logging
- `business-context`: Business logic context enrichment
- `error-context`: Error and exception context capture
- `performance-context`: Performance and timing context

### 4. Security & Compliance (HIGH)
- `sensitive-data-protection`: Preventing sensitive data in logs
- `pii-masking`: Personal identifiable information masking
- `audit-logging`: Security event and audit trail logging
- `compliance-fields`: Compliance-required log fields
- `encryption-security`: Log encryption and secure transport
- `access-control`: Log access control and permissions

### 5. Performance Optimization (MEDIUM-HIGH)
- `log-buffering`: Efficient log buffering and batching
- `async-logging`: Non-blocking asynchronous logging
- `log-compression`: Log compression for storage efficiency
- `sampling-strategies`: Log sampling for high-volume scenarios
- `resource-limits`: Memory and CPU limits for logging

### 6. Integration & Monitoring (MEDIUM-HIGH)
- `elk-integration`: ELK stack structured logging integration
- `prometheus-metrics`: Log-based metrics and alerting
- `opentelemetry-tracing`: Distributed tracing integration
- `log-aggregation`: Centralized log aggregation patterns

### 7. Migration & Adoption (MEDIUM)
- `migration-strategy`: Gradual migration from unstructured logging
- `legacy-integration`: Integrating with existing logging systems
- `team-adoption`: Team training and adoption strategies

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/schema-base-fields.md                    # Standard log schema
rules/python-structlog.md                       # Python implementation
rules/correlation-ids.md                        # Request correlation
rules/sensitive-data-protection.md             # Security best practices
rules/elk-integration.md                       # ELK stack integration
```

Each rule file contains:
- Impact level and category
- Problem description with consequences
- Solution with code examples
- Common mistakes to avoid
- When to apply the rule

## Reference Documentation

Detailed guides for complex topics:

```
references/log-schema-design.md         # Complete log schema design
references/framework-comparison.md      # Logging framework comparison
references/enterprise-patterns.md        # Enterprise logging patterns
```

## Full Compiled Document

For the complete structured JSON logging guide with all rules expanded: `AGENTS.md`

---

*Structured JSON Logging Version: Compatible with modern logging frameworks and ELK stack*
*Focus: Production-ready, enterprise-grade logging for observability and monitoring*</content>
<parameter name="filePath">skills/structured-json-logging-skill/SKILL.md