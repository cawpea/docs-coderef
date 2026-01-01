# Symbol Error Examples

This document contains intentional symbol-related errors.

## Non-Existent Function

This references a function that doesn't exist:

<!-- CODE_REF: src/basic/functions.ts#nonExistentFunction -->

```typescript
export function nonExistentFunction(): void {
  console.log('This function does not exist in the source file');
}
```

## Non-Existent Variable

This references a variable that doesn't exist:

<!-- CODE_REF: src/basic/variables.ts#NON_EXISTENT_CONSTANT -->

```typescript
export const NON_EXISTENT_CONSTANT = 'does not exist';
```

## Non-Existent Class

This references a class that doesn't exist:

<!-- CODE_REF: src/basic/classes.ts#NonExistentClass -->

```typescript
export class NonExistentClass {
  constructor() {}
}
```

## Non-Existent Method

This references a method that doesn't exist in the User class:

<!-- CODE_REF: src/basic/classes.ts#User#nonExistentMethod -->

```typescript
nonExistentMethod(): void {
  console.log('This method does not exist');
}
```

## File Not Found

This references a file that doesn't exist:

<!-- CODE_REF: src/basic/non-existent-file.ts#someFunction -->

```typescript
export function someFunction(): void {
  console.log('The file itself does not exist');
}
```

## Wrong File Extension

This tries to use symbol reference on a non-TypeScript file (if it existed):

<!-- CODE_REF: README.md#someSymbol -->

```markdown
# Some Symbol

This shouldn't work because symbol search only works on TS/JS files
```
