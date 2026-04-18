# ⚙️ Agentic Skills

**Engineering workflows for AI that actually ship to production.**

Professional-grade Agentic Skills for modern software engineering.
Built from real-world best practices, official documentation, and production experience.

---

## 🧠 What This Project Is

**agentic-skills** is a collection of reusable engineering workflows for AI agents.

These are not prompts.
These are not generic tips.

👉 These are **structured systems** that tell AI:

* what to do
* when to do it
* how to verify it

Each skill encodes how experienced engineers actually build software.

---

## 🎯 Why This Exists

AI-generated code often looks correct — but fails under real conditions.

* Security gaps (CSRF, SQL injection)
* Performance issues (N+1 queries, inefficient ORM usage)
* Data integrity problems (missing transactions)
* Poor production readiness

👉 Fast output. Fragile systems.

Modern AI needs more than prompts.
It needs **engineering discipline**.

---

## ⚡ What Makes This Different

Inspired by real engineering workflows:

**Define → Plan → Build → Verify → Review → Ship**

Each skill provides:

* Trigger conditions (when to apply)
* Step-by-step execution flow
* Anti-pattern detection
* Verification checkpoints

👉 AI stops guessing and starts following a process

---

## 🧩 Example

### ❌ Without workflows

```python
articles = Article.objects.all()
for article in articles:
    print(article.author.name)
```

### ✅ With agentic-skills

```python
articles = Article.objects.select_related('author').all()
```

👉 Eliminates N+1 queries automatically

---

## ⚡ Quick Start (30 seconds)

1. Pick a skill:

```
skills/django-skill/AGENTS.md
```

2. Copy it into your AI context (Claude / Cursor / Copilot)

3. Use it in your prompt:

```text
Use Django agentic-skills best practices while implementing this feature
```

👉 Your AI now follows structured engineering workflows

---

## 📦 Installation

No installation required.

Agentic Skills are Markdown-based workflows.

You can use them by:

* Copying `AGENTS.md` into your AI context
* Referencing skills during prompts
* Integrating into your internal AI tools

Optional:

* Store skills locally for reuse
* Inject into system prompts
* Use in custom AI pipelines

---

## 🧠 Usage Patterns

### 1. Feature Development

```text
Build a Django API using agentic-skills best practices
```

### 2. Code Review

```text
Review this code using Django agentic-skills rules
```

### 3. Refactoring

```text
Refactor this module using agentic-skills workflow
```

### 4. Debugging

```text
Find performance issues using Django database rules
```

👉 Works across any AI agent

---

## 🚀 Available Skills

### Django

* **170+ rules** across **13 categories** covering the complete Django ecosystem
* **Comprehensive production-ready patterns** for models, views, templates, security, and deployment
* **Security & Authentication**: CSRF protection, SQL injection prevention, XSS prevention, HTTPS enforcement, password hashing, session security
* **Database & Models**: Migration safety, strategic indexing, foreign key protection, N+1 query elimination, constraints validation, transaction management
* **Views & URLs**: Function vs class-based views, HTTP method handling, error responses, pagination, caching strategies, API serialization
* **Forms**: ModelForm usage, validation logic, security cleaning, error display, file handling, formsets
* **Templates**: Inheritance patterns, context management, security filters, static files, internationalization, performance optimization
* **Authentication & Authorization**: User management, permissions system, custom user models, session security, password policies, social auth
* **URLs & Admin**: Configuration patterns, reverse URL generation, namespace implementation, admin customization, actions, security
* **Testing**: Unit vs integration testing, fixtures usage, mocking strategies, coverage goals, Django TestCase optimization
* **Performance & Caching**: Query optimization, caching strategies, static file optimization, middleware tuning, async support
* **Deployment**: Environment separation, secret management, static file serving, database configuration, monitoring setup, backup strategies
* **Advanced Patterns**: Signals usage, custom middleware, model managers, generic views, admin customization, internationalization
* **Enterprise-grade**: Production deployment, security hardening, performance optimization, monitoring integration

### FastAPI ⭐ New

* **100+ individual rules** across **40 categories** covering the complete FastAPI ecosystem
* **Fully aligned with official FastAPI documentation** (https://fastapi.tiangolo.com/)
* **Async & Concurrency**: Endpoint async patterns, dependency injection, database operations, background tasks
* **Security & Authentication**: JWT implementation, CORS configuration, rate limiting, OAuth2 flows, API key authentication
* **Validation & Models**: Pydantic model usage, custom validators, nested models, field constraints
* **Core Parameters**: Path/query/header parameters, request bodies, file uploads, form data handling
* **API Design**: RESTful principles, pagination implementation, error response standardization, API versioning, streaming responses
* **Data Handling**: Extra data types, JSON encoding, custom response classes, content negotiation
* **Application Structure**: Bigger applications organization, dependency injection patterns, router management
* **Database & ORM**: Async database operations, SQLAlchemy integration, connection management
* **Testing**: Async testing strategies, test client usage, mocking dependencies, integration testing
* **Performance**: Response caching, concurrency limits, GZip compression, background task optimization
* **Deployment**: Production server setup (Uvicorn/Gunicorn), containerization, environment configuration
* **Documentation**: OpenAPI customization, request examples, metadata configuration, custom docs URLs
* **Web Standards**: Cookie/header parameters, static file serving, lifespan events, middleware integration
* **Development & Debug**: Debugging configuration, development server setup, error handling
* **Response Handling**: Custom response classes, status codes, headers, cookies, streaming responses
* **Advanced Security**: Multi-layered authentication, RBAC implementation, security middleware, input sanitization
* **Advanced Patterns**: WebSocket support, partial updates, monitoring integration, path operation configuration, event-driven architecture
* **Complete coverage**: From basic async endpoints to advanced enterprise API patterns

### Celery ⭐ New

* **170+ rules** across **21 categories** covering the complete Celery distributed task ecosystem
* **Comprehensive background task processing** with production-ready patterns and best practices
* **Configuration & Setup**: Broker configuration (Redis/RabbitMQ), environment separation, connection pooling
* **Task Definition & Execution**: Atomic operations, calling methods (delay/apply_async), timeout management, task options
* **Error Handling & Reliability**: Intelligent retry strategies, exponential backoff, exception handling, circuit breakers
* **Canvas Workflows**: Chain (sequential), group (parallel), chord (sync), map/starmap (batch processing)
* **Monitoring & Logging**: Task tracking, performance metrics, structured logging, alerting integration
* **Performance & Scaling**: Concurrency tuning, worker pool optimization, prefetch configuration, resource management
* **Security**: Task authentication, authorization checks, secure message passing, access control
* **Result Backends**: Backend selection (Redis/DB), expiry management, serialization optimization, result caching
* **Routing & Queues**: Task distribution, queue management, priority routing, worker specialization
* **Periodic Tasks**: Celery Beat scheduling, timezone handling, reliable execution, dynamic scheduling
* **Serialization**: Data transmission handling, custom serializers, complex object serialization
* **Worker Management**: Lifecycle management, health monitoring, graceful shutdown, resource cleanup
* **Signals & Events**: Event hooking for monitoring, custom behavior extension, workflow tracking
* **Remote Control**: Runtime worker inspection, task management, queue control, live debugging
* **Testing**: Unit testing tasks, integration testing, workflow testing, mocking strategies
* **Daemonization**: Production service management, process supervision, auto-restart, logging
* **Debugging**: Task inspection, worker debugging, performance profiling, issue resolution
* **Advanced Performance**: High-throughput optimization, connection pooling, result backend tuning
* **Extensions**: Custom bootsteps, monitoring extensions, behavior customization
* **Advanced Patterns**: Complex workflow orchestration, event-driven processing, distributed patterns
* **Enterprise-grade**: Production deployment, monitoring integration, security hardening, scalability patterns

### Celery

* Task execution, retries, scaling, monitoring
* Reliable distributed workflow patterns

---

## 🧩 How It Works

Each skill is a portable workflow:

* Problem → real-world impact
* Process → structured steps
* Validation → verification criteria
* Output → production-ready code

👉 Skills act as **plug-in intelligence for AI systems**

---

## 🌍 Project Overview

This project contains specialized skills for frameworks and tools.

Each skill helps developers:

* Avoid common pitfalls and anti-patterns
* Apply proven best practices (security, performance, maintainability)
* Make better architectural decisions
* Accelerate development with real code patterns

Currently includes:

* **Django** (full-stack web development)
* **FastAPI** (modern async API development)
* **Docker** (complete containerization ecosystem)
* **Redis** (comprehensive data structure and caching patterns)
* **Celery** (distributed task processing)

The `assets/` directory includes supporting resources such as official documentation archives.

---

## ⚙️ Advanced Usage

You can integrate agentic-skills into custom workflows:

* Load skills into system prompts
* Use with LangChain or custom agents
* Build internal developer tools
* Combine with CI/CD validation flows

👉 Ideal for teams building AI-powered development pipelines

---

## 🤝 Contributing

We focus on **high-quality, real-world skills**.

A good skill should be:

* Actionable (clear execution steps)
* Verifiable (measurable outcome)
* Based on real production experience

Add new skills:

```
skills/[framework]-skill/
```

---

## ⚡ Vision

A shared, cross-agent layer of engineering workflows.

👉 Write once. Use across any AI.

---

## ⭐ Support

If this improves your workflow:

* Star the repository
* Share it with your team
* Contribute new skills

---

## 🧠 One-Line Summary

**AI doesn’t need better prompts. It needs better engineering workflows.**
