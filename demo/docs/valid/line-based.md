# Line-Based CODE_REF Examples

This document demonstrates valid line-based CODE_REF patterns.

## Basic Function (Lines 5-12)

Here's the `greet` function with its JSDoc comment:

<!-- CODE_REF: src/basic/functions.ts:5-12 -->

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

## Add Function (Lines 14-22)

The simple `add` function:

<!-- CODE_REF: src/basic/functions.ts:14-22 -->

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

## Arrow Function (Lines 24-29)

An arrow function example:

<!-- CODE_REF: src/basic/functions.ts:24-29 -->

```typescript
/**
 * Arrow function example
 */
export const multiply = (a: number, b: number): number => {
  return a * b;
};
```

## Multi-Parameter Function (Lines 31-36)

A function with multiple parameters:

<!-- CODE_REF: src/basic/functions.ts:31-36 -->

```typescript
/**
 * Function with multiple parameters
 */
export function formatUserInfo(
  firstName: string,
  lastName: string,
  age: number
): string {
  return `${firstName} ${lastName} (${age} years old)`;
}
```

## Default Export (Lines 38-43)

Default export function:

<!-- CODE_REF: src/basic/functions.ts:38-43 -->

```typescript
/**
 * Default export function
 */
export default function welcome(): string {
  return 'Welcome to the demo!';
}
```
