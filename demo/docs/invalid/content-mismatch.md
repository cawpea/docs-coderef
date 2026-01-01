# Content Mismatch Examples

This document contains intentional CODE_CONTENT_MISMATCH errors.
The code blocks don't match the actual source code.

## Outdated Function Documentation

This shows an old version of the greet function:

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

## Wrong Variable Value

The API_KEY has the wrong value:

<!-- CODE_REF: src/basic/variables.ts#API_KEY -->

```typescript
/**
 * API configuration constants
 */
export const API_KEY = 'demo-api-key-12345';
```

## Modified Method

The getName method has different implementation:

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

## Missing JSDoc

The add function is shown without its JSDoc comment:

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

## Wrong Line Count

This has extra lines that don't exist in the source:

<!-- CODE_REF: src/basic/variables.ts:7-7 -->

```typescript
*/
```
