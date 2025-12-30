# Coding Standards

## Linting & Formatting

```bash
npm run lint               # Lint TypeScript files
npm run lint:fix           # Auto-fix linting issues
npm run format             # Format code with Prettier
npm run format:check       # Check formatting without modifying
npm run type-check         # Run TypeScript compiler checks
```

## Pre-commit Hooks

This project uses [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to automatically lint and format staged files before each commit.

The pre-commit hook will:

1. Run ESLint with auto-fix on staged TypeScript files
2. Run Prettier on staged files (TS, JS, JSON, MD)
3. Prevent commit if linting errors remain

To skip hooks (not recommended):

```bash
git commit --no-verify
```

## Configuration Files

- `prettier.config.js` - Code formatting rules
- `eslint.config.js` - Linting rules (ESLint 9 flat config)
- `.vscode/settings.json` - VS Code auto-format on save

## Code Style

- **Indentation**: 2 spaces
- **Semicolons**: Enabled
- **Quotes**: Single quotes
- **Print width**: 100 characters
- **Line endings**: LF (Unix)
- **Trailing commas**: ES5 style
- **Type imports**: Prefer `import type` for type-only imports
