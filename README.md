# Agentic Skills - Framework Best Practices

Professional-grade Agentic Skills for modern software engineering. High-performance implementations across multiple languages and frameworks, following official documentation best practices for scalable agentic workflows. 🛠️

## 🎯 Project Overview

This project contains specialized "skills" - comprehensive best practices guides for various frameworks and libraries. Each skill is designed to help developers:

- **Avoid common pitfalls** and anti-patterns
- **Follow industry best practices** for security, performance, and maintainability
- **Make informed architectural decisions** with impact-based prioritization
- **Accelerate development** with ready-to-use code examples and patterns

We currently maintain **2 complete skills** covering Django web development and Celery distributed task processing, with comprehensive coverage of every major aspect of each framework. The `assets/` directory contains supporting resources like official documentation archives for offline reference during skill development.

## 📁 Project Structure

```
agentic-skills/
├── README.md                          # This file
├── skills_manager.py                  # Skills discovery and management script
├── skills/                            # Framework skills directory
│   └── django-skill/                  # Django best practices skill
│       ├── SKILL.md                   # Skill overview and quick reference
│       ├── AGENTS.md                  # Complete compiled rules reference
│       ├── rules/                     # Individual rule files (60+ rules)
│       │   ├── security-*.md         # Security & authentication rules
│       │   ├── db-*.md               # Database & model rules
│       │   ├── views-*.md            # Views & URLs rules
│       │   ├── forms-*.md            # Forms rules
│       │   └── ...                   # Additional rule categories
│       └── references/                # Advanced workflow guides
│           ├── workflows.md          # Development workflow patterns
│           ├── middleware-signals.md # Advanced middleware & signals
│           └── deployment-static.md  # Deployment & static files
├── assets/                            # Supporting assets and resources
│   └── django-docs-5.2-en.zip        # Django official documentation archive
├── skills/[framework]-skill/         # Future skills (Celery, React, etc.)
├── Claude_skills_best_practices.md    # General best practices documentation
└── skills/[framework]-skill/         # Future skills (Celery, React, etc.)
```

## 🚀 Current Skills

### Django Development Best Practices ⭐
**Status:** Complete | **Rules:** 60+ | **Impact:** Comprehensive

A complete Django development framework covering:
- **Security & Authentication** (CRITICAL): CSRF protection, SQL injection prevention, XSS prevention, HTTPS enforcement
- **Database & Models** (CRITICAL): Migration safety, indexing strategies, foreign key protection, N+1 query prevention
- **Views & URLs** (HIGH): Function vs class views, HTTP methods, error handling, pagination
- **Forms** (HIGH): ModelForm usage, validation logic, security, file handling
- **Templates** (MEDIUM-HIGH): Inheritance patterns, context data, security filters
- **Authentication & Authorization** (MEDIUM-HIGH): User management, permissions, custom user models
- **Testing** (MEDIUM-HIGH): Unit vs integration tests, fixtures, mocking, coverage
- **Performance & Caching** (MEDIUM): Query optimization, caching strategies, static files
- **Deployment** (MEDIUM): Environment separation, secret management, monitoring

**Quick Start:**
- 📖 **Overview:** `skills/django-skill/SKILL.md`
- 📚 **Complete Reference:** `skills/django-skill/AGENTS.md`
- 🔍 **Specific Rules:** `skills/django-skill/rules/[category]-[rule-name].md`

### Celery Development Best Practices 🆕
**Status:** Complete | **Rules:** 16+ | **Impact:** Comprehensive

A complete Celery distributed task processing framework covering:
- **Configuration & Setup** (CRITICAL): Broker setup, environment separation
- **Task Definition & Execution** (CRITICAL): Calling methods, atomic operations
- **Error Handling & Reliability** (HIGH): Intelligent retry strategies
- **Canvas: Designing Work-flows** (HIGH): Chains, groups, chords for complex workflows
- **Monitoring & Logging** (HIGH): Task tracking, performance metrics
- **Performance & Scaling** (MEDIUM-HIGH): Concurrency tuning and optimization
- **Security** (MEDIUM-HIGH): Task authentication and access control
- **Result Backends** (MEDIUM-HIGH): Backend selection and expiry management
- **Routing & Queues** (MEDIUM): Intelligent task distribution
- **Periodic Tasks** (MEDIUM): Celery Beat scheduling
- **Serialization** (MEDIUM): Safe data transmission
- **Worker Management** (MEDIUM): Lifecycle and resource management
- **Advanced Patterns** (LOW): Complex workflow orchestration

**Quick Start:**
- 📖 **Overview:** `skills/celery-skill/SKILL.md`
- 📚 **Complete Reference:** `skills/celery-skill/AGENTS.md`
- 🔍 **Specific Rules:** `skills/celery-skill/rules/[category]-[rule-name].md`
- 🛠️ **Worker Management Guide:** `skills/celery-skill/references/worker-management.md`
- 🛠️ **Worker Management Guide:** `skills/celery-skill/references/worker-management.md`

## 🔄 How Skills Work

Each skill follows a consistent, impact-driven structure:

### Rule Categories by Priority
| Priority | Focus | Description | Example Rules |
|----------|-------|-------------|---------------|
| **CRITICAL** | Security & Data Integrity | Prevents breaches, corruption, crashes | CSRF protection, SQL injection prevention |
| **HIGH** | Architecture & Performance | Core application health | View patterns, database optimization |
| **MEDIUM-HIGH** | Developer Experience | Code quality, maintainability | Template patterns, testing strategies |
| **MEDIUM** | Scalability & Operations | Production readiness | Caching, deployment configuration |
| **LOW** | Advanced Features | Framework mastery | Custom middleware, advanced patterns |

### Rule Structure
Every rule follows this template:
```markdown
# [Rule Name] ([IMPACT_LEVEL])

**Impact:** [CRITICAL|HIGH|MEDIUM-HIGH|MEDIUM|LOW] - [Brief impact description]

**Problem:**
[Detailed problem description with consequences]

**Solution:**
[Clear, actionable solution]

✅ **Correct:** [Working code example]
❌ **Wrong:** [Anti-pattern example]

**Common mistakes:**
- [Frequent errors to avoid]

**When to apply:**
- [Specific use cases]
```
