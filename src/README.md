# Build System

This directory contains the build automation for the claude-skills repository, inspired by Vercel's agent-skills build system.

## Scripts

- `npm run build` - Compiles rules into AGENTS.md for each skill
- `npm run validate` - Validates rule files have required frontmatter
- `npm run extract-tests` - Extracts test cases from rules for LLM evaluation
- `npm run dev` - Runs validate, build, and extract-tests in sequence

## File Structure

- `build.js` - Main build script that compiles AGENTS.md from rules
- `validate.js` - Validates rule files for consistency
- `extract-tests.js` - Extracts code examples as test cases
- `README.md` - This documentation

## Dependencies

- `gray-matter` - Parses Markdown frontmatter
- `glob` - File pattern matching
- `fs-extra` - Enhanced file system operations

## How It Works

1. **Build Process**: Reads all `rules/*.md` files, parses frontmatter, sorts by impact priority and title, compiles into structured AGENTS.md
2. **Validation**: Checks each rule has required fields (name/title, description)
3. **Test Extraction**: Pulls code blocks from rules and creates test-cases.json for LLM evaluation

## Adding New Rules

1. Create rule file in `skills/[skill]/rules/` with frontmatter:
   ```yaml
   ---
   title: Rule Title
   impact: HIGH
   impactDescription: Brief description
   tags: tag1, tag2
   ---
   ```
2. Run `npm run build` to regenerate AGENTS.md
3. Run `npm run extract-tests` to update test cases