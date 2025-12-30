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

Reference code by function or variable name:

```markdown
<!-- CODE_REF: src/index.ts#myFunction -->
```

This will find and extract the `myFunction` function from `src/index.ts` using AST parsing.

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

### Example 4: Multiple References in One Document

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
- Use symbol references for code that may move around in the file
- Keep referenced code blocks focused and readable
- Update references when refactoring code
- Always include the code block immediately after the CODE_REF comment

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
