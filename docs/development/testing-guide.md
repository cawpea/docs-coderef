# Testing Guide

## Running Tests

```bash
npm test                   # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

## Running Specific Tests

Run a specific test file:

```bash
npx jest src/utils/foo.test.ts       # Run specific test file
npx jest -t "<test-name-pattern>"    # Run tests matching pattern
```

## Coverage Requirements

Coverage thresholds are set to 80% for all metrics (branches, functions, lines, statements). CLI code is excluded from coverage as it's verified through integration tests.

## Writing Tests

- Test files should be co-located with source files as `**/*.test.ts`
- Use the path alias `@/` which maps to `src/`
- Tests run in Node.js environment using ts-jest preset
- Follow existing test patterns in the codebase
