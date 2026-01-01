# Combined Patterns - Real World Example

This document demonstrates a realistic documentation scenario with both valid and invalid CODE_REF patterns mixed together.

## Getting Started

### Basic Functions

The `greet` function is the main entry point for greeting users:

<!-- CODE_REF: src/basic/functions.ts#greet -->

```typescript
/**
 * Greets a person by name
 * @param name - The name of the person to greet
 * @returns A greeting message
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

You can also use the `add` function for calculations (this has wrong line numbers):

<!-- CODE_REF: src/basic/functions.ts:20-22 -->

```typescript
export function add(a: number, b: number): number {
  return a + b;
}
```

### Configuration

Configure your application using these constants:

<!-- CODE_REF: src/basic/variables.ts#API_KEY -->

```typescript
export const API_KEY = 'demo-api-key-12345';
```

The API endpoint is defined here (this has outdated content):

<!-- CODE_REF: src/basic/variables.ts#API_ENDPOINT -->

```typescript
export const API_ENDPOINT = 'https://old-api.example.com';
```

### User Management

The User class provides user management capabilities:

<!-- CODE_REF: src/basic/classes.ts#User#getName -->

```typescript
/**
 * Gets the user's name
 * @returns The user's name
 */
getName(): string {
  return this.name;
}
```

This is a reference without a code block:

<!-- CODE_REF: src/basic/classes.ts#User#getEmail -->

The getEmail method returns the user's email address.

### Advanced Features

For type-safe operations, use generic functions:

<!-- CODE_REF: src/advanced/generics.ts#getFirst -->

```typescript
/**
 * Generic function that returns the first element of an array
 * @param items - Array of items
 * @returns The first element or undefined
 */
export function getFirst<T>(items: T[]): T | undefined {
  return items[0];
}
```

And for async operations (this references a non-existent function):

<!-- CODE_REF: src/advanced/async.ts#nonExistentAsyncFunc -->

```typescript
export async function nonExistentAsyncFunc(): Promise<void> {
  await Promise.resolve();
}
```

### Working with Products

The Product class helps manage products:

<!-- CODE_REF: src/basic/classes.ts#Product#applyDiscount -->

```typescript
/**
 * Applies a discount to the product
 * @param percentage - Discount percentage (0-100)
 * @returns The discounted price
 */
applyDiscount(percentage: number): number {
  return this.price * (1 - percentage / 100);
}
```

### Utility Functions

For formatting, use the multi-parameter function:

<!-- CODE_REF: src/basic/functions.ts:30-36 -->

```typescript
export function formatUserInfo(
  firstName: string,
  lastName: string,
  age: number
): string {
  return `${firstName} ${lastName} (${age} years old)`;
}
```

## Summary

This document contains:

- ✅ 5 valid CODE_REF references
- ❌ 1 wrong line number (add function)
- ❌ 1 content mismatch (API_ENDPOINT)
- ❌ 1 missing code block (getEmail)
- ❌ 1 symbol not found (nonExistentAsyncFunc)

Total: 9 CODE_REF comments (5 valid, 4 invalid)
