# Symbol-Based CODE_REF Examples

This document demonstrates valid symbol-based CODE_REF patterns.

## Function Reference

Here's the `greet` function referenced by symbol:

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

## Another Function

The `add` function:

<!-- CODE_REF: src/basic/functions.ts#add -->

```typescript
/**
 * Adds two numbers together
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 */
export function add(a: number, b: number): number {
  return a + b;
}
```

## Arrow Function Reference

Arrow function stored in a const:

<!-- CODE_REF: src/basic/functions.ts#multiply -->

```typescript
/**
 * Arrow function example
 */
export const multiply = (a: number, b: number): number => {
  return a * b;
};
```

## Generic Function

Generic function from advanced examples:

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

## Async Function

Async function example:

<!-- CODE_REF: src/advanced/async.ts#fetchUser -->

```typescript
/**
 * Async function that fetches user data
 * @param userId - The ID of the user to fetch
 * @returns Promise resolving to user data
 */
export async function fetchUser(
  userId: string
): Promise<{ id: string; name: string }> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: userId, name: 'John Doe' });
    }, 100);
  });
}
```
