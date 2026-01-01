# Missing Code Blocks Examples

This document contains intentional CODE_BLOCK_MISSING errors.
CODE_REF comments are not followed by code blocks.

## Missing Block After Reference

This CODE_REF is not followed by a code block:

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

This is just regular text, not a code block.

## Another Missing Block

<!-- CODE_REF: src/basic/variables.ts#API_KEY -->

```typescript
/**
 * API configuration constants
 */
export const API_KEY = 'demo-api-key-12345';
```

Some more text without a code block.

## CODE_REF Followed by Different Content

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

Here we have a paragraph instead of a code block. The validation should fail because there's no code block immediately following the CODE_REF comment.

## Mixed Case: Valid Reference Followed by Text

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

The fetchUser function is an async function that fetches user data. But this description is not in a code block!
