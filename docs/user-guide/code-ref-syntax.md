# CODE_REF Syntax

## Overview

CODE_REF comments allow you to reference code in your documentation and keep it synchronized with your actual source code.

## Reference by Line Numbers

Reference code by specifying line ranges:

```markdown
<!-- CODE_REF: src/index.ts:10-20 -->
```

This will extract lines 10-20 from `src/index.ts`.

## Reference by Symbol Name

Reference code by function name:

```markdown
<!-- CODE_REF: src/index.ts#myFunction -->
```

This will find and extract the `myFunction` function from `src/index.ts` using AST parsing.

## Reference Variables

Reference variables (const, let, var):

```markdown
<!-- CODE_REF: src/config.ts#API_KEY -->
```

This will find and extract the `API_KEY` variable from `src/config.ts` using AST parsing. Supports:

- `const`, `let`, and `var` declarations
- Exported variables
- Destructuring patterns (object, array, rest syntax)
- Multiple declarators in a single statement

## Reference Class Methods

Reference specific class methods:

```markdown
<!-- CODE_REF: src/MyClass.ts#MyClass#myMethod -->
```

This will find and extract the `myMethod` method from the `MyClass` class in `src/MyClass.ts`.

## Examples

### Example 1: Line-based Reference

Suppose you have a file `src/utils/helper.ts` with the following content:

```typescript
// src/utils/helper.ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export function farewell(name: string): string {
  return `Goodbye, ${name}!`;
}
```

In your markdown documentation, you can reference the `greet` function by line numbers:

````markdown
Here's our greeting function:

<!-- CODE_REF: src/utils/helper.ts:2-4 -->

```typescript
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```
````

The tool will verify that lines 2-4 match the code block below the comment.

### Example 2: Symbol Reference

Using the same file, you can reference by function name instead:

````markdown
Here's our greeting function:

<!-- CODE_REF: src/utils/helper.ts#greet -->

```typescript
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```
````

The tool will use AST parsing to find the `greet` function, regardless of which line it's on.

### Example 3: Class Method Reference

Suppose you have a class in `src/models/User.ts`:

```typescript
// src/models/User.ts
export class User {
  constructor(private name: string) {}

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
  }
}
```

You can reference the `getName` method specifically:

````markdown
The `getName` method returns the user's name:

<!-- CODE_REF: src/models/User.ts#User#getName -->

```typescript
getName(): string {
  return this.name;
}
```
````

### Example 4: Variable Reference

Suppose you have a configuration file `src/config.ts`:

```typescript
// src/config.ts
/**
 * API endpoint URL
 */
export const API_ENDPOINT = 'https://api.example.com';

/**
 * Maximum retry attempts
 */
export const MAX_RETRIES = 3;

// Environment variables with destructuring
const { API_KEY, SECRET_KEY } = process.env;
```

You can reference variables:

````markdown
Here's our API endpoint configuration:

<!-- CODE_REF: src/config.ts#API_ENDPOINT -->

```typescript
/**
 * API endpoint URL
 */
export const API_ENDPOINT = 'https://api.example.com';
```

Here's a destructured variable:

<!-- CODE_REF: src/config.ts#API_KEY -->

```typescript
const { API_KEY, SECRET_KEY } = process.env;
```
````

Note: When referencing a destructured variable, the entire destructuring statement is extracted.

### Example 5: Multiple References in One Document

You can have multiple CODE_REF comments in a single markdown file:

````markdown
# API Documentation

## Authentication

<!-- CODE_REF: src/auth/login.ts#authenticate -->

```typescript
export async function authenticate(username: string, password: string) {
  // authentication logic
}
```

## User Management

<!-- CODE_REF: src/models/User.ts#User#getName -->

```typescript
getName(): string {
  return this.name;
}
```
````

## Best Practices

- Use line-based references for stable code sections
- Use symbol references (functions/variables) for code that may move around in the file
- Use variable references for configuration constants and important declarations
- Keep referenced code blocks focused and readable
- Update references when refactoring code
- Always include the code block immediately after the CODE_REF comment

## Symbol Resolution Priority

When a symbol name matches both a function and a variable, the function takes precedence:

```typescript
const config = { port: 3000 }; // This won't be referenced
function config() {
  /* ... */
} // This will be referenced
```

To reference the variable in this case, consider renaming one of them or using line-based references.

## Known Limitations

### Variable Reference Limitations

The variable reference feature has the following limitations:

#### 1. Nested Destructuring Not Supported

Nested destructuring patterns are not currently supported:

❌ **Not Supported:**

```typescript
const {
  a: {
    b: { c },
  },
} = obj;
```

✅ **Workaround:** Use line-based references for nested destructuring:

```markdown
<!-- CODE_REF: src/config.ts:10-15 -->
```

#### 2. Renamed Destructured Properties Not Supported

Property renaming in destructuring is not supported:

❌ **Not Supported:**

```typescript
const { originalName: renamedVar } = obj;
```

Attempting to reference `renamedVar` will not work.

✅ **Workaround:** Use line-based references or refactor to use the original property name.

#### 3. Only Top-Level Variables Are Searchable

Variables declared inside functions, blocks, or other scopes cannot be referenced by symbol:

❌ **Not Supported:**

```typescript
function myFunction() {
  const localVar = 'value'; // Cannot be referenced
}

if (condition) {
  const blockVar = 'value'; // Cannot be referenced
}
```

✅ **Supported:**

```typescript
const topLevelVar = 'value'; // Can be referenced

export const exportedVar = 'value'; // Can be referenced
```

✅ **Workaround:** For non-top-level variables, use line-based references.

### General Limitations

- Symbol references only work with TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`)
- For other file types, use line-based references
- CODE_REF comments must be immediately followed by a code block (empty lines allowed)

## Common Mistakes

### Missing Code Block

❌ **Wrong:**

```markdown
<!-- CODE_REF: src/index.ts#myFunction -->

Some other content here...
```

✅ **Correct:**

````markdown
<!-- CODE_REF: src/index.ts#myFunction -->

```typescript
export function myFunction() {
  // ...
}
```
````

### Incorrect Path

❌ **Wrong:**

```markdown
<!-- CODE_REF: index.ts#myFunction -->
```

✅ **Correct:**

```markdown
<!-- CODE_REF: src/index.ts#myFunction -->
```

Always use paths relative to your project root.

## Validation and Fixing

After adding CODE_REF comments, run validation:

```bash
npx coderef validate
```

If there are mismatches, fix them interactively:

```bash
npx coderef fix
```

For implementation details, see [CODE_REF Syntax Implementation](../architecture/code-ref-syntax.md).
