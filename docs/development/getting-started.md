# Getting Started

## Prerequisites

- **Minimum Node.js version**: 16.0.0 (specified in `package.json` engines)
- **Recommended version**: See `.node-version` file in the project root

## Building

```bash
npm run build              # Build for production (CJS + ESM + types)
npm run dev                # Watch mode for development
```

## Testing

```bash
npm test                   # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

Coverage thresholds are set to 80% for all metrics (branches, functions, lines, statements). CLI code is excluded from coverage as it's verified through integration tests.

## Running Specific Tests

```bash
npx jest src/utils/foo.test.ts       # Run specific test file
npx jest -t "<test-name-pattern>"    # Run tests matching pattern
```

## Documentation Validation

When making changes to user-facing code (CLI, public APIs, etc.), validate that documentation is updated:

```bash
npm run docs:validate      # Check if documentation needs updating
```

This script automatically detects your base branch and suggests which documentation files to update. See [Documentation Guidelines](documentation.md) for details.
