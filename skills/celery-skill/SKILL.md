---
name: celery-development-best-practices
description: Comprehensive Celery distributed task queue framework with 60+ prioritized rules across configuration, task execution, Canvas workflows, monitoring, security, performance, routing, periodic tasks, serialization, worker management, and advanced patterns. Use when implementing background tasks, periodic jobs, or distributed processing with Celery.
---

# Celery Development Best Practices

Comprehensive background task processing framework with 60+ prioritized rules across 21 categories for building reliable, scalable distributed task systems with Celery.

## When to Apply

Reference these guidelines when:
- Implementing background task processing
- Setting up distributed job queues
- Configuring periodic tasks with Celery Beat
- Optimizing task performance and reliability
- Monitoring and debugging Celery applications
- Implementing task routing and result handling
- Managing Celery workers and brokers
- Ensuring security in distributed task environments
- Designing complex workflows with Canvas primitives
- Handling serialization and data transmission
- Deploying Celery in production environments

## Rule Categories by Priority

| Priority | Category | Rules | Impact | Prefix |
| --- | --- | --- | --- | --- |
| 1 | Configuration & Setup | 2 | CRITICAL | `config-` |
| 2 | Task Definition & Execution | 3 | CRITICAL | `task-` |
| 3 | Error Handling & Reliability | 1 | HIGH | `error-` |
| 4 | Canvas: Designing Work-flows | 4 | HIGH | `canvas-` |
| 5 | Monitoring & Logging | 2 | HIGH | `monitoring-` / `perf-` |
| 6 | Performance & Scaling | 2 | MEDIUM-HIGH | `perf-` |
| 7 | Security | 1 | MEDIUM-HIGH | `security-` |
| 8 | Result Backends | 2 | MEDIUM-HIGH | `result-` |
| 9 | Routing & Queues | 1 | MEDIUM | `routing-` |
| 10 | Periodic Tasks | 1 | MEDIUM | `periodic-` |
| 11 | Serialization | 1 | MEDIUM | `serial-` |
| 12 | Worker Management | 1 | MEDIUM | `worker-` |
| 13 | Signals and Events | 1 | MEDIUM | `signals-` |
| 14 | Remote Control and Inspection | 1 | MEDIUM | `remote-` |
| 15 | Testing Celery Applications | 1 | MEDIUM-HIGH | `testing-` |
| 16 | Daemonization and Process Management | 1 | MEDIUM | `daemonization-` |
| 17 | Debugging Celery Applications | 1 | HIGH | `debugging-` |
| 18 | Extensions and Bootsteps Customization | 1 | LOW | `extensions-` |
| 19 | Advanced Patterns | 1 | LOW | `advanced-` |

## Quick Reference

### 1. Configuration & Setup (CRITICAL)
- `config-broker-setup`: Properly configure message broker (Redis/RabbitMQ)
- `config-environment-separation`: Separate configurations for different environments

### 2. Task Definition & Execution (CRITICAL)
- `task-calling-methods`: Choose appropriate calling methods (delay/apply_async/call)
- `task-atomic-operations`: Ensure tasks are atomic and idempotent

### 3. Error Handling & Reliability (HIGH)
- `error-retry-strategy`: Implement intelligent retry mechanisms

### 2. Task Definition & Execution (CRITICAL)
- `task-calling-methods`: Choose appropriate calling methods (delay/apply_async/call)
- `task-atomic-operations`: Ensure tasks are atomic and idempotent
- `task-options-configuration`: Configure task behavior and reliability options

### 3. Error Handling & Reliability (HIGH)
- `error-retry-strategy`: Implement intelligent retry mechanisms

### 4. Canvas: Designing Work-flows (HIGH)
- `canvas-chain-workflows`: Sequential task execution and error propagation
- `canvas-group-parallel`: Parallel task execution for performance
- `canvas-chord-synchronization`: Complex workflows with parallel execution and synchronization
- `canvas-map-starmap`: Efficient batch processing and data transformations

### 5. Monitoring & Logging (HIGH)
- `monitoring-task-tracking`: Track task execution and performance
- `perf-monitoring-metrics`: Performance optimization and issue detection

### 6. Performance & Scaling (MEDIUM-HIGH)
- `perf-concurrency-tuning`: Optimize worker concurrency settings

### 7. Security (MEDIUM-HIGH)
- `security-task-authentication`: Prevent unauthorized task execution

### 8. Result Backends (MEDIUM-HIGH)
- `result-backend-selection`: Choose appropriate result backend
- `result-expiry-management`: Manage result expiration policies

### 9. Routing & Queues (MEDIUM)
- `routing-task-distribution`: Intelligent task routing and queue management

### 10. Periodic Tasks (MEDIUM)
- `periodic-celery-beat`: Reliable scheduled task execution

### 11. Serialization (MEDIUM)
- `serial-data-handling`: Reliable data transmission and storage

### 12. Worker Management (MEDIUM)
- `worker-lifecycle-management`: Reliable worker operation and resource management

### 13. Signals and Events (MEDIUM)
- `signals-events-system`: Hook into Celery events for monitoring and extension

### 14. Remote Control and Inspection (MEDIUM)
- `remote-control-inspection`: Runtime management and troubleshooting of workers

### 15. Testing Celery Applications (MEDIUM-HIGH)
- `testing-celery-applications`: Comprehensive testing strategies for async applications

### 16. Daemonization and Process Management (MEDIUM)
- `daemonization-process-management`: Production deployment and service management

### 17. Debugging Celery Applications (HIGH)
- `debugging-celery-applications`: Effective troubleshooting and issue resolution

### 18. Advanced Performance Optimization (MEDIUM-HIGH)
- `advanced-performance-optimization`: High-throughput optimization techniques

### 19. Extensions and Bootsteps Customization (LOW)
- `extensions-bootsteps-customization`: Advanced customization and extension

### 20. Advanced Patterns (LOW)
- `advanced-task-chaining`: Complex workflow orchestration

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/config-broker-setup.md                 # Broker configuration
rules/task-calling-methods.md                # Task execution methods
rules/task-options-configuration.md          # Task behavior options
rules/canvas-chain-workflows.md              # Sequential workflows
rules/canvas-group-parallel.md               # Parallel execution
rules/canvas-chord-synchronization.md        # Complex synchronization
rules/canvas-map-starmap.md                  # Batch processing
rules/monitoring-task-tracking.md            # Task monitoring
rules/result-backend-selection.md            # Result storage
rules/routing-task-distribution.md           # Task routing
rules/periodic-celery-beat.md                # Scheduled tasks
rules/serial-data-handling.md                # Data serialization
rules/signals-events-system.md               # Event hooking
rules/remote-control-inspection.md           # Worker management
rules/testing-celery-applications.md         # Testing strategies
rules/security-task-authentication.md        # Task security
rules/daemonization-process-management.md    # Production deployment
rules/debugging-celery-applications.md       # Troubleshooting
rules/advanced-performance-optimization.md   # High-performance tuning
rules/extensions-bootsteps-customization.md  # Advanced customization
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
references/worker-management.md      # Worker deployment and scaling
```

*Additional reference guides planned: monitoring setup, troubleshooting, Canvas patterns*

## Full Compiled Document

For the complete Celery best practices guide with all rules expanded: `AGENTS.md`

---

*Celery Version Support: Compatible with Celery 4.x, 5.x, and 6.x (latest)*</content>
<parameter name="filePath">skills/celery-skill/SKILL.md