# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@cawpea/coderef` is a tool for validating and auto-fixing code references in markdown documentation. It ensures code snippets in documentation stay synchronized with actual source code through CODE_REF comments and AST-based symbol searching.

## Quick Reference

- **Architecture**: See [docs/architecture/overview.md](docs/architecture/overview.md)
- **Development Setup**: See [docs/development/getting-started.md](docs/development/getting-started.md)
- **Coding Standards**: See [docs/development/coding-standards.md](docs/development/coding-standards.md)
- **Git Conventions**: See [docs/development/git-conventions.md](docs/development/git-conventions.md)
- **Testing**: See [docs/development/testing-guide.md](docs/development/testing-guide.md)

## Essential Information

### Code Style (Quick Reference)

- **Indentation**: 2 spaces
- **Semicolons**: Enabled
- **Quotes**: Single quotes
- **Print width**: 100 characters
- **Line endings**: LF (Unix)
- **Trailing commas**: ES5 style
- **Type imports**: Prefer `import type` for type-only imports

### Common Commands

```bash
npm run build              # Build for production (CJS + ESM + types)
npm test                   # Run all tests
npm run lint:fix           # Auto-fix linting issues
npm run format             # Format code with Prettier
npm run type-check         # Run TypeScript compiler checks
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`, `build`, `revert`

See [docs/development/git-conventions.md](docs/development/git-conventions.md) for the complete type table and semantic versioning impact.

## Full Documentation

For comprehensive documentation, see [docs/README.md](docs/README.md).
