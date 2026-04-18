# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **documentation-only repository** — no build system, no tests, no CI. It contains Claude Agent Skills: structured Markdown guides that Claude loads on-demand to follow framework-specific best practices. The current skill covers Django (81 rules); planned skills include Celery, React, FastAPI, PostgreSQL, Redis, Docker, and Kubernetes.

## No Build or Test Commands

There are no build, lint, or test commands. All content is Markdown. Code examples inside rule files should be tested manually in the target framework's environment before committing.

## Skill Structure

Each skill lives under `skills/[framework]-skill/` and follows this layout:

```
skills/django-skill/
├── SKILL.md          # YAML frontmatter (name, description) + overview — kept under 500 lines
├── AGENTS.md         # Compiled concatenation of all rules — for full-text search
├── rules/            # One file per rule, ~81 files for Django
└── references/       # Advanced multi-topic guides (workflows, middleware, deployment)
```

### Rule file template

Every file in `rules/` follows this exact structure:

```markdown
# [Rule Name] ([IMPACT_LEVEL])

**Impact:** [CRITICAL|HIGH|MEDIUM-HIGH|MEDIUM|LOW] - [Brief description]

**Problem:**
[What goes wrong and why it matters]

**Solution:**
[Actionable fix]

✅ **Correct:** [Working code example]
❌ **Wrong:** [Anti-pattern example]

**Common mistakes:**
- [Pitfalls to avoid]

**When to apply:**
- [Specific contexts]
```

### Impact priority order

CRITICAL (security/data integrity) → HIGH (architecture/performance) → MEDIUM-HIGH (DX/code quality) → MEDIUM (scalability/ops) → LOW (advanced features)

## SKILL.md Authoring Rules (from `Claude_skills_best_practices.md`)

- **YAML frontmatter** requires `name` (≤64 chars, lowercase/hyphens only, no "anthropic"/"claude") and `description` (≤1024 chars, third-person, specific triggers)
- **Keep SKILL.md body under 500 lines** — move overflow content to separate reference files
- **References one level deep only** — SKILL.md → reference files, never chain references
- **Progressive disclosure** — SKILL.md is the index; detailed content lives in separate files loaded on demand
- **Concise over verbose** — assume Claude already knows framework fundamentals; only add context Claude doesn't have
- Reference files longer than 100 lines need a table of contents at the top
- Use forward slashes in all file paths (never backslashes)

## Adding a New Skill

1. Create `skills/[framework]-skill/` with `rules/` and `references/` subdirectories
2. Write 50+ rules following the template above, prioritized CRITICAL → LOW
3. Keep `SKILL.md` under 500 lines; link to `references/` for overflow
4. Compile all rules into `AGENTS.md` for searchability
5. Test all code examples in the actual framework before committing

## Key Files for Reference

- [Claude_skills_best_practices.md](Claude_skills_best_practices.md) — authoritative guide on SKILL.md authoring, progressive disclosure, and evaluation-driven development
- [skills/django-skill/SKILL.md](skills/django-skill/SKILL.md) — canonical example of a well-structured SKILL.md
- [skills/django-skill/rules/](skills/django-skill/rules/) — 81 rule files as authoring examples
- `assets/django-docs-5.2-en.zip` — offline Django documentation for reference during rule development
