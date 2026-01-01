# Getting Started

## Prerequisites

- **Minimum Node.js version**: 22.0.0 (specified in `package.json` engines)
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

## Demo Environment

The project includes a comprehensive demo environment for testing CODE_REF functionality:

```bash
npm run demo:validate        # Validate all demo documentation
npm run demo:validate:valid  # Validate only valid examples (should pass)
npm run demo:validate:invalid # Validate invalid examples (shows errors)
npm run demo:fix:dry         # Preview fixes without applying
npm run demo:fix             # Interactive fix mode
npm run demo:reset           # Reset demo to original state
```

The demo environment is located in the `demo/` directory and includes:

- Sample TypeScript files with various code patterns
- Documentation examples (valid, invalid, and mixed)
- Shell scripts for testing

See `demo/README.md` for detailed usage instructions.

## Documentation Validation

When making changes to user-facing code (CLI, public APIs, etc.), validate that documentation is updated:

```bash
npm run docs:validate      # Check if documentation needs updating
```

This script automatically detects your base branch and suggests which documentation files to update. See [Documentation Guidelines](documentation.md) for details.
