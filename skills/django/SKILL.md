---
name: django-development-best-practices
description: Comprehensive Django development framework with prioritized rules across models, views, templates, security, and performance. Use when building Django applications, writing models, creating views, implementing authentication, or optimizing Django projects.
---

# Django Development Best Practices

Comprehensive performance and development optimization guide for Django applications, containing 60+ rules across 9 categories, prioritized by impact to guide automated development and code generation.

## When to Apply

Reference these guidelines when:
- Building new Django applications or features
- Writing models, views, templates, or forms
- Implementing authentication and security
- Optimizing database queries and performance
- Setting up testing and deployment
- Reviewing Django code for best practices
- Customizing admin interfaces and URL configurations
- Implementing caching strategies and middleware
- Working with static files and media uploads
- Understanding Django signals and advanced patterns

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
| --- | --- | --- | --- |
| 1 | Security & Authentication | CRITICAL | `security-` |
| 2 | Database & Models | CRITICAL | `db-` |
| 3 | Views & URLs | HIGH | `views-` |
| 4 | Forms | HIGH | `forms-` |
| 5 | Templates | MEDIUM-HIGH | `templates-` |
| 6 | Authentication & Authorization | MEDIUM-HIGH | `auth-` |
| 7 | APIs | MEDIUM-HIGH | `api-` |
| 8 | URLs & Admin | MEDIUM-HIGH | `urls-` / `admin-` |
| 9 | Email & Tasks | MEDIUM-HIGH | `email-` / `background-` |
| 10 | Testing | MEDIUM-HIGH | `testing-` |
| 11 | Performance & Caching | MEDIUM | `perf-` / `caching-` |
| 12 | Deployment | MEDIUM | `deploy-` |
| 13 | Advanced Patterns | LOW | `advanced-` |

## Quick Reference

### 1. Security & Authentication (CRITICAL)
- `security-csrf-protection`: Always enable CSRF protection for forms
- `security-sql-injection`: Use parameterized queries and ORM methods
- `security-xss-prevention`: Escape user input in templates
- `security-https-only`: Force HTTPS in production
- `security-password-hashing`: Use Django's password hashing
- `security-session-security`: Secure session configuration
- `signing-cryptography`: Secure data signing for integrity and tamper prevention

### 2. Database & Models (CRITICAL)
- `db-migration-safety`: Never modify migrations manually
- `db-indexes-strategy`: Add indexes for frequently queried fields
- `db-foreign-key-protection`: Use on_delete appropriately
- `db-n-plus-one-queries`: Use select_related and prefetch_related
- `db-constraints-validation`: Use model and database constraints
- `db-transaction-management`: Wrap related operations in transactions

### 3. Views & URLs (HIGH)
- `views-function-vs-class`: Choose appropriate view type
- `views-http-methods`: Handle HTTP methods correctly
- `views-error-handling`: Implement proper error responses
- `views-pagination`: Use Django's pagination for large datasets
- `views-caching-strategy`: Implement appropriate caching layers
- `views-api-serialization`: Use proper serialization for APIs
- `exceptions-error-handling`: Proper exception handling and error views
- `http-request-response`: Handling HttpRequest and HttpResponse objects

### 4. Forms (HIGH)
- `forms-modelform-usage`: Prefer ModelForm for model-backed forms
- `forms-validation-logic`: Implement custom validation methods
- `forms-security-cleaning`: Always clean and validate form data
- `forms-error-display`: Provide clear error messages to users
- `forms-file-handling`: Handle file uploads securely
- `forms-formsets-usage`: Use formsets for multiple related forms
- `validators`: Built-in and custom validators for data validation

### 5. Templates (MEDIUM-HIGH)
- `templates-inheritance-pattern`: Use template inheritance for DRY templates
- `templates-context-data`: Keep templates simple, logic in views
- `templates-filters-security`: Use safe filters carefully
- `templates-static-files`: Manage static files properly
- `templates-internationalization`: Implement i18n support
- `templates-performance`: Minimize template rendering overhead

### 6. Authentication & Authorization (MEDIUM-HIGH)
- `auth-user-management`: Implement secure user authentication
- `auth-permissions-groups`: Use Django's permission system
- `auth-custom-user-model`: Extend user model when needed
- `auth-session-security`: Secure session handling
- `auth-password-security`: Password management best practices
- `auth-social-auth`: Third-party authentication integration

### 7. URLs & Admin (MEDIUM-HIGH)
- `urls-configuration-patterns`: Organize URL patterns effectively
- `urls-reverse-urls`: Use reverse() for URL generation
- `urls-namespaces`: Implement URL namespaces and app names
- `admin-customization`: Customize Django admin interface
- `admin-actions-filters`: Add custom admin actions and filters
- `admin-security`: Secure admin interface access

### 6. Testing (MEDIUM-HIGH)
- `testing-unit-vs-integration`: Write appropriate test types
- `testing-fixtures-usage`: Use fixtures for test data
- `testing-mocking-strategy`: Mock external dependencies
- `testing-coverage-goals`: Maintain high test coverage
- `testing-django-testcase`: Use Django's TestCase subclasses
- `testing-factory-pattern`: Use factories for complex test data

### 7. Performance (MEDIUM)
- `perf-query-optimization`: Optimize database queries
- `perf-caching-strategy`: Implement multiple caching layers
- `perf-static-file-optimization`: Optimize static file serving
- `perf-database-indexing`: Use appropriate database indexes
- `perf-middleware-optimization`: Order middleware efficiently
- `perf-async-support`: Use async views where appropriate
- `async-views-tasks`: Asynchronous operations and background tasks
- `files-media-handling`: File uploads and storage management

### 8. Deployment (MEDIUM)
- `deploy-environment-separation`: Separate development and production
- `deploy-secret-management`: Securely manage secrets and keys
- `deploy-static-files-serving`: Configure static file serving
- `deploy-database-configuration`: Optimize database settings
- `deploy-monitoring-setup`: Implement logging and monitoring
- `deploy-backup-strategy`: Implement data backup procedures
- `settings-management`: Django settings configuration and environment variables

### 9. Advanced Patterns (LOW)
- `advanced-signals-usage`: Use signals appropriately
- `advanced-middleware-custom`: Implement custom middleware
- `advanced-model-managers`: Create custom model managers
- `advanced-generic-views`: Extend generic views properly
- `advanced-admin-customization`: Customize admin interface
- `advanced-internationalization`: Implement advanced i18n features
- `middleware-basics`: Middleware concepts and custom middleware creation
- `unicode-text-handling`: Encoding and text processing for international apps

## How to Use

Read individual rule files for detailed explanations and code examples:

```
rules/security-csrf-protection.md
rules/db-migration-safety.md
rules/views-function-vs-class.md
rules/auth-user-management.md
rules/admin-customization.md
rules/caching-strategy.md
```

Each rule file contains:
- Impact level and category
- Problem description
- Solution with code examples
- Common mistakes to avoid
- When to apply the rule

## Reference Documentation

Detailed guides for complex topics:

```
references/workflows.md          # Development workflow patterns
references/middleware-signals.md  # Middleware and signals implementation
references/deployment-static.md   # Static files, media, and deployment
```

## Full Compiled Document

For the complete Django best practices guide with all rules expanded: `AGENTS.md`