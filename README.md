# @cawpea/coderef

> Validate and fix code references in markdown documentation

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Status**: 🚧 Under Development

## Overview

`@cawpea/coderef` is a tool to validate and automatically fix code references in markdown documentation. It ensures that code snippets in your documentation stay in sync with your actual source code.

## Features

- ✅ Validate CODE_REF comments against actual source code
- 🔧 Auto-fix outdated references
- 🎯 AST-based symbol searching for TypeScript/JavaScript
- 📝 Interactive fix mode with colored diffs
- 🎨 Beautiful diff display
- 🚫 Ignore file support for excluding files

## Installation

```bash
npm install --save-dev @cawpea/coderef
```

## Quick Start

### CLI Usage

```bash
# Validate all CODE_REF references
npx coderef validate

# Fix errors interactively
npx coderef fix

# Auto-fix without prompts
npx coderef fix --auto
```

### Programmatic Usage

```typescript
import { validate, fix } from '@cawpea/coderef';

// Validate
const result = await validate({
  projectRoot: '.',
  docsDir: 'docs',
});

// Fix
await fix({
  projectRoot: '.',
  docsDir: 'docs',
  auto: true,
});
```

## CODE_REF Syntax

Reference code by line numbers:

```markdown
<!-- CODE_REF: src/index.ts:10-20 -->
```

Reference code by symbol name (functions):

```markdown
<!-- CODE_REF: src/index.ts#myFunction -->
```

Reference variables (const, let, var):

```markdown
<!-- CODE_REF: src/config.ts#API_KEY -->
<!-- CODE_REF: src/constants.ts#MAX_RETRIES -->
```

Reference class methods:

```markdown
<!-- CODE_REF: src/MyClass.ts#MyClass#myMethod -->
```

For detailed syntax and options, see [docs/user-guide/code-ref-syntax.md](docs/user-guide/code-ref-syntax.md).

## Examples

### Example 1: Documenting API Function Usage

In your `docs/api.md`:

````markdown
## Authentication

Our API uses JWT tokens for authentication. Here's the implementation:

<!-- CODE_REF: src/auth/jwt.ts#generateToken -->

```typescript
export function generateToken(userId: string): string {
  // This code will be automatically extracted from src/auth/jwt.ts
}
```

Call this function with a user ID to generate a valid token.
````

When you run `npx coderef validate`, it will verify that the `generateToken` function exists in `src/auth/jwt.ts` and extract its implementation automatically.

### Example 2: Keeping Configuration Examples Up-to-Date

In your `docs/configuration.md`:

````markdown
## Environment Variables

Set the following environment variables:

<!-- CODE_REF: src/config.ts#config -->

```typescript
export const config = {
  apiKey: process.env.API_KEY,
  apiUrl: process.env.API_URL,
};
```

These values are loaded at application startup.
````

If the `config` object in your source code changes, running `npx coderef fix --auto` will automatically update the documentation to reflect the current implementation.

### Example 3: Documenting Specific Code Sections

In your `docs/tutorial.md`:

````markdown
## Error Handling

Our error handling middleware is implemented as follows:

<!-- CODE_REF: src/middleware/error-handler.ts:15-35 -->

```typescript
export function errorHandler(err: Error, req: Request, res: Response) {
  console.error(err.stack);
  res.status(500).json({
    error: err.message,
    timestamp: new Date().toISOString(),
  });
}
```

This middleware catches all errors and formats them consistently.
````

This references lines 15-35 of the file. If the code changes, `coderef` will detect the mismatch and help you update the reference.

For more examples and usage patterns, see [docs/user-guide/](docs/user-guide/).

## Configuration

Create `.coderefrc.json` in your project root:

```json
{
  "projectRoot": ".",
  "docsDir": "docs",
  "ignoreFile": ".gitignore"
}
```

## Development

This package is currently under active development. More documentation will be added soon.

## License

MIT © cawpea
