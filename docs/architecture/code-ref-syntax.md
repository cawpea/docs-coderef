# CODE_REF Syntax Implementation

## Supported Reference Patterns

The tool supports four reference patterns:

1. **Line-based references**: `<!-- CODE_REF: src/index.ts:10-20 -->`
2. **Function references**: `<!-- CODE_REF: src/index.ts#myFunction -->`
3. **Variable references**: `<!-- CODE_REF: src/config.ts#API_KEY -->`
4. **Class method references**: `<!-- CODE_REF: src/MyClass.ts#MyClass#myMethod -->`

## AST Parsing

Uses `@typescript-eslint/typescript-estree` for TypeScript/JavaScript symbol searching and code extraction.

### Symbol Search Implementation

Symbol search is implemented in `src/utils/ast-symbol-search.ts`:

- **Functions**: `findFunctionByName()` searches for top-level and exported function declarations
- **Variables**: `findVariableByName()` searches for top-level and exported variable declarations
  - Supports `const`, `let`, and `var`
  - Handles destructuring patterns (object, array, rest syntax)
  - Returns entire declaration statement for multiple declarators
- **Class Methods**: `findMethodInClass()` searches for methods within a specific class

### Symbol Resolution Priority

When multiple symbols match the same name, the search order is:

1. Class methods (if className is specified)
2. Functions
3. Variables

This means functions take precedence over variables when both exist with the same name.

### Variable Declaration Support

The variable search supports:

- **Simple declarations**: `const x = 1;`
- **Multiple declarators**: `const x = 1, y = 2;` (entire statement is extracted)
- **Exported variables**: `export const API_KEY = 'key';`
- **Object destructuring**: `const { a, b } = obj;`
- **Array destructuring**: `const [x, y] = arr;`
- **Rest syntax**: `const { ...rest } = obj;`, `const [...items] = arr;`
- **JSDoc comments**: Automatically included in the extracted code
