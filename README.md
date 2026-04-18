# Claude Skills - Framework Best Practices

Professional-grade Claude Skills for modern software engineering. High-performance implementations across multiple languages and frameworks, following official documentation best practices for scalable agentic workflows. 🛠️

## 🎯 Project Overview

This project contains specialized "skills" - comprehensive best practices guides for various frameworks and libraries. Each skill is designed to help developers:

- **Avoid common pitfalls** and anti-patterns
- **Follow industry best practices** for security, performance, and maintainability
- **Make informed architectural decisions** with impact-based prioritization
- **Accelerate development** with ready-to-use code examples and patterns

We currently maintain **2 complete skills** covering Django web development and Celery distributed task processing, with comprehensive coverage of every major aspect of each framework. The `assets/` directory contains supporting resources like official documentation archives for offline reference during skill development.

## 📁 Project Structure

```
claude-skills/
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

## 🎯 How to Use

### Quick Skills Overview
```bash
# List all available skills
python skills_manager.py

# Get detailed info about a specific skill
python skills_manager.py django
python skills_manager.py celery
```

### For Individual Rules
1. **Identify your need:** Security issue, performance problem, code quality concern
2. **Find the right skill:** Check available skills for your framework/library
3. **Navigate by priority:** Start with CRITICAL rules for your use case
4. **Apply the solution:** Use provided code examples and adapt to your project

### For Comprehensive Learning
1. **Read the overview:** Start with `skills/[skill]/SKILL.md` for quick reference
2. **Dive deep:** Use `skills/[skill]/AGENTS.md` for complete reference
3. **Follow workflows:** Check `skills/[skill]/references/` for step-by-step guides
4. **Apply systematically:** Work through rules by priority level

### For Code Reviews
1. **Check by category:** Review code against relevant rule categories
2. **Prioritize issues:** Address CRITICAL and HIGH impact issues first
3. **Use as checklist:** Reference rules during pull request reviews

## 🤝 Contributing

### Adding New Skills

We welcome contributions of new skills for frameworks and libraries! Here's how:

#### 1. **Choose Your Framework**
Select a framework/library that would benefit from comprehensive best practices:
- **Popular choices:** React, Vue.js, Express.js, FastAPI, Spring Boot, Laravel
- **Specialized tools:** Celery, Redis, Elasticsearch, PostgreSQL, MongoDB
- **Languages:** Python, JavaScript, Go, Rust, Java

#### 2. **Research Phase (1-2 weeks)**
```bash
# Create skill directory under skills/
mkdir skills/[framework]-skill
cd skills/[framework]-skill

# Research and analyze
# - Official documentation
# - Community best practices
# - Common pitfalls and solutions
# - Security considerations
# - Performance patterns
```

#### 3. **Create Skill Structure**
```bash
# Create required directories
mkdir rules references

# Create main files
touch SKILL.md AGENTS.md
# Note: This should be done within skills/[framework]-skill/
```

#### 4. **Develop Rules (1-2 weeks)**
- Create 50+ rules following the established template
- Prioritize by impact (CRITICAL → HIGH → MEDIUM-HIGH → MEDIUM → LOW)
- Include working code examples and anti-patterns
- Cover security, performance, maintainability, and best practices

#### 5. **Quality Assurance**
- Test all code examples
- Ensure framework version compatibility
- Cross-reference related rules
- Validate against real-world usage

#### 6. **Submit Your Skill**
```bash
# Create pull request with:
# - Complete skill directory
# - Tested code examples
# - Comprehensive rule coverage
# - Quality documentation
```

### Improving Existing Skills

- **Bug fixes:** Correct errors in code examples or rule descriptions
- **Updates:** Add rules for new framework features or versions
- **Enhancements:** Improve examples, add more context, or clarify solutions
- **Documentation:** Enhance references, add more workflow guides

## 🔮 Roadmap

### Upcoming Skills (Planned)
- **React** - Modern React development patterns
- **FastAPI** - High-performance API development
- **PostgreSQL** - Advanced database design and optimization
- **Redis** - Caching and data structure patterns
- **Docker** - Containerization best practices
- **Kubernetes** - Orchestration and deployment patterns
- **Express.js** - Node.js API development best practices
- **Spring Boot** - Java microservices development

### Future Enhancements
- **Interactive rule explorer** with search and filtering
- **Code example playground** for testing patterns
- **Integration guides** between different skills
- **Automated rule validation** for code examples
- **Multi-language support** for broader framework coverage

## 📋 Requirements

- **For using skills:** Basic knowledge of the target framework
- **For contributing:** Deep expertise in the framework + technical writing skills
- **Tools needed:** Markdown editor, code testing environment, documentation tools
- **Repository:** This is a Git repository - contributions via pull requests are welcome

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Django Community** for extensive documentation and best practices
- **Open Source Contributors** for sharing knowledge and patterns
- **Security Researchers** for vulnerability analysis and prevention guidance
- **Framework Maintainers** for creating excellent developer tools

## 📞 Support

- **Issues:** Report bugs or request new skills via GitHub Issues
- **Discussions:** Join conversations about framework best practices
- **Contributions:** See CONTRIBUTING.md for detailed contribution guidelines

---

**Project Summary:**
- **Total Skills:** 2 (Django + Celery)
- **Total Rules:** 120+ (Django: 81+, Celery: 16+)
- **Project Structure:** Organized with `skills/` directory for framework-specific guides

**Repository:** This project is version controlled with Git. All skills are maintained as markdown files for easy contribution and collaboration.

**Remember:** These skills are living guides that evolve with frameworks and best practices. Regular updates ensure they remain current and valuable for developers worldwide.</content>
<parameter name="filePath">README.md