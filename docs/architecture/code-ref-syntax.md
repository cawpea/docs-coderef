# CODE_REF Syntax Implementation

## Supported Reference Patterns

The tool supports three reference patterns:

1. **Line-based references**: `<!-- CODE_REF: src/index.ts:10-20 -->`
2. **Symbol references**: `<!-- CODE_REF: src/index.ts#myFunction -->`
3. **Class method references**: `<!-- CODE_REF: src/MyClass.ts#MyClass#myMethod -->`

## AST Parsing

Uses `@typescript-eslint/typescript-estree` for TypeScript/JavaScript symbol searching and code extraction.
