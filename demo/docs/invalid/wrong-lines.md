# Wrong Line Numbers Examples

This document contains intentional CODE_LOCATION_MISMATCH errors.
The code content is correct, but the line numbers are wrong.

## Wrong Lines for greet Function

This references lines 1-5, but the actual function is at lines 7-13:

<!-- CODE_REF: src/basic/functions.ts:1-5 -->

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

## Wrong Lines for add Function

This references lines 20-22, but the actual function is at lines 16-18:

<!-- CODE_REF: src/basic/functions.ts:20-22 -->

```typescript
export function add(a: number, b: number): number {
  return a + b;
}
```

## Wrong Lines for API_KEY

This references line 10, but the actual constant is at line 7:

<!-- CODE_REF: src/basic/variables.ts:10-10 -->

```typescript
export const API_VERSION = 'v1';
```
