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

* 60+ rules covering security, ORM, architecture, testing, and deployment
* Designed for real production scenarios

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

* Django (full-stack web development)
* Celery (distributed task processing)

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
