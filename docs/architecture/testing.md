# Testing Strategy

## Test Configuration

- Test files: Co-located with source files as `**/*.test.ts`
- Path alias: `@/` maps to `src/`
- Environment: Node.js
- Preset: ts-jest

## Coverage Requirements

Coverage thresholds are set to 80% for all metrics (branches, functions, lines, statements). CLI code is excluded from coverage as it's verified through integration tests.
