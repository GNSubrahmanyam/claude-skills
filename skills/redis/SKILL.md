---
name: redis-data-structures-caching-best-practices
description: Comprehensive Redis framework with data structures, caching patterns, session management, and performance optimization. Use when implementing caching, session storage, task queues, or real-time features.
---

# Redis Data Structures & Caching Best Practices

Comprehensive Redis framework with 50+ rules across data structures, caching patterns, session management, pub/sub messaging, and performance optimization. Designed for high-performance caching, session storage, and real-time applications.

## When to Apply

Reference these guidelines when:
- Implementing application caching (Django, FastAPI)
- Managing user sessions and authentication
- Building real-time features with pub/sub
- Optimizing database performance with Redis
- Implementing task queues and job processing
- Building scalable web applications
- Managing distributed locks and rate limiting

## Rule Categories by Priority

| Priority | Category | Impact | Rules | Prefix |
| --- | --- | --- | --- | --- | --- |
| 1 | Data Structures | HIGH | 12 | `data-` |
| 2 | Caching Patterns | HIGH | 15 | `cache-` |
| 3 | Session Management | MEDIUM-HIGH | 8 | `session-` |
| 4 | Pub/Sub Messaging | MEDIUM-HIGH | 6 | `pubsub-` |
| 5 | Performance Optimization | MEDIUM | 6 | `perf-` |
| 6 | Security & Deployment | MEDIUM | 4 | `security-` |

## Quick Reference

### 1. Data Structures (HIGH)
- `data-strings`: String operations and atomic counters
- `data-hashes`: Hash maps for object storage
- `data-lists`: Ordered collections and queues
- `data-sets`: Unique element collections
- `data-sorted-sets`: Ordered unique elements with scores

### 2. Caching Patterns (HIGH)
- `cache-django`: Django cache framework integration
- `cache-fastapi`: FastAPI response caching
- `cache-database`: Database query result caching
- `cache-api`: API response caching with invalidation

### 3. Session Management (MEDIUM-HIGH)
- `session-django`: Django session storage in Redis
- `session-custom`: Custom session management
- `session-security`: Secure session handling

### 4. Pub/Sub Messaging (MEDIUM-HIGH)
- `pubsub-channels`: Channel-based messaging
- `pubsub-patterns`: Pattern matching subscriptions
- `pubsub-integration`: Application integration patterns

### 5. Performance Optimization (MEDIUM)
- `perf-persistence`: RDB and AOF configuration
- `perf-memory`: Memory management and eviction policies
- `perf-connection`: Connection pooling and pipelining

### 6. Security & Deployment (MEDIUM)
- `security-auth`: Authentication and access control
- `security-encryption`: Data encryption at rest
- `security-deployment`: Production Redis deployment

## Quick Start
- 📖 **Overview:** `skills/redis-skill/SKILL.md`
- 📚 **Complete Reference:** `skills/redis-skill/AGENTS.md`
- 🔍 **Specific Rules:** `skills/redis-skill/rules/[category]-[rule-name].md`