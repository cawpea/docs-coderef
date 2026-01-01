# docs-coderef Demo Environment

This directory contains a complete local testing environment for the `docs-coderef` tool. It demonstrates various CODE_REF patterns, both valid and intentionally invalid, to help you understand how the tool works.

## Prerequisites

- Node.js >= 22.0.0
- The project must be built before running demos

## Quick Start

1. **Build the project**:

   ```bash
   npm run build
   ```

2. **Validate the demo documentation**:

   ```bash
   npx docs-coderef validate demo/docs
   ```

3. **Test the fix command**:
   ```bash
   npx docs-coderef fix
   ```

Or use the convenience scripts:

```bash
# Quick validation
npm run demo:validate

# Validate only valid examples
npm run demo:validate:valid

# Validate only invalid examples (will show errors)
npm run demo:validate:invalid

# Test fix in dry-run mode
npm run demo:fix:dry

# Test fix in auto mode
npm run demo:fix:auto
```

## Directory Structure

```
demo/
├── README.md                          # This file
├── .docs-coderefrc.json              # Demo-specific configuration
├── src/                              # Sample source code files
│   ├── basic/
│   │   ├── functions.ts              # Various function patterns
│   │   ├── variables.ts              # Constants and variables
│   │   └── classes.ts                # Class and method examples
│   ├── advanced/
│   │   ├── generics.ts               # Generic functions/classes
│   │   ├── destructuring.ts          # Destructuring patterns
│   │   └── async.ts                  # Async/await patterns
│   └── edge-cases/
│       ├── overloads.ts              # Function overloads
│       └── multiple-symbols.ts       # Multiple symbols with same name
├── docs/                             # Sample markdown documentation
│   ├── valid/
│   │   ├── line-based.md             # ✅ Valid line-based references
│   │   ├── symbol-based.md           # ✅ Valid symbol references
│   │   ├── class-methods.md          # ✅ Valid class method references
│   │   └── variables.md              # ✅ Valid variable references
│   ├── invalid/
│   │   ├── wrong-lines.md            # ❌ Intentional line mismatch errors
│   │   ├── missing-blocks.md         # ❌ Missing code blocks
│   │   ├── content-mismatch.md       # ❌ Code content doesn't match
│   │   └── symbol-errors.md          # ❌ Symbol not found errors
│   └── mixed/
│       └── combined-patterns.md      # 🔀 Mix of valid and invalid
└── scripts/
    ├── test-validate.sh              # Run validation on demo
    ├── test-fix.sh                   # Run fix on demo (with backup)
    └── reset-demo.sh                 # Reset demo to initial state
```

## Demo Scenarios

### 1. Valid References (`docs/valid/`)

These files demonstrate correct usage of CODE_REF comments:

- **line-based.md**: Line number references like `<!-- CODE_REF: src/basic/functions.ts:7-13 -->`
- **symbol-based.md**: Symbol references like `<!-- CODE_REF: src/basic/functions.ts#greet -->`
- **class-methods.md**: Class method references like `<!-- CODE_REF: src/basic/classes.ts#User#getName -->`
- **variables.md**: Variable references like `<!-- CODE_REF: src/basic/variables.ts#API_KEY -->`

Run validation:

```bash
npx docs-coderef validate demo/docs/valid
```

Expected result: ✅ All validations should pass

### 2. Invalid References (`docs/invalid/`)

These files contain intentional errors to demonstrate error detection:

- **wrong-lines.md**: `CODE_LOCATION_MISMATCH` - Code is correct but at different line numbers
- **missing-blocks.md**: `CODE_BLOCK_MISSING` - CODE_REF without following code block
- **content-mismatch.md**: `CODE_CONTENT_MISMATCH` - Code block doesn't match source
- **symbol-errors.md**: `SYMBOL_NOT_FOUND` - References to non-existent symbols

Run validation:

```bash
npx docs-coderef validate demo/docs/invalid
```

Expected result: ❌ Multiple validation errors (this is intentional!)

### 3. Mixed Patterns (`docs/mixed/`)

- **combined-patterns.md**: A realistic documentation file with both valid and invalid references

Run validation:

```bash
npx docs-coderef validate demo/docs/mixed/combined-patterns.md
```

Expected result: ⚠️ Some errors, some successes

## Example Commands

### Validation

```bash
# Validate all demo documentation
npx docs-coderef validate demo/docs

# Validate specific file
npx docs-coderef validate demo/docs/valid/symbol-based.md

# Validate specific directory
npx docs-coderef validate demo/docs/valid

# Validate with verbose output
npx docs-coderef validate demo/docs --verbose

# Change working directory to demo first
cd demo
npx docs-coderef validate docs
```

### Fix

```bash
# Interactive fix with preview (recommended)
npx docs-coderef fix

# Dry-run mode (preview without making changes)
npx docs-coderef fix --dry-run

# Auto-fix all errors without prompting
npx docs-coderef fix --auto

# Create backups before fixing
npx docs-coderef fix --backup
```

### Using Shell Scripts

```bash
# From project root:
./demo/scripts/test-validate.sh    # Build and validate
./demo/scripts/test-fix.sh          # Build and run fix
./demo/scripts/reset-demo.sh        # Reset demo to original state
```

## CODE_REF Pattern Reference

### Line-Based References

```markdown
<!-- CODE_REF: src/basic/functions.ts:7-13 -->
```

References specific line numbers in a file.

### Symbol References

```markdown
<!-- CODE_REF: src/basic/functions.ts#greet -->
```

References a function, class, or variable by name.

### Class Method References

```markdown
<!-- CODE_REF: src/basic/classes.ts#User#getName -->
```

References a method within a class: `ClassName#methodName`

### Symbol with Line Hint

```markdown
<!-- CODE_REF: src/edge-cases/multiple-symbols.ts#DataProcessor#process:10-15 -->
```

Useful when multiple symbols have the same name.

## Expected Validation Output

### Valid Files

When validating `demo/docs/valid/`, you should see:

```
✓ demo/docs/valid/line-based.md - All 5 CODE_REF references are valid
✓ demo/docs/valid/symbol-based.md - All 5 CODE_REF references are valid
✓ demo/docs/valid/class-methods.md - All 5 CODE_REF references are valid
✓ demo/docs/valid/variables.md - All 8 CODE_REF references are valid
```

### Invalid Files

When validating `demo/docs/invalid/`, you should see errors like:

```
✗ demo/docs/invalid/wrong-lines.md
  - CODE_LOCATION_MISMATCH: Code matches but at different lines

✗ demo/docs/invalid/missing-blocks.md
  - CODE_BLOCK_MISSING: No code block found after CODE_REF

✗ demo/docs/invalid/content-mismatch.md
  - CODE_CONTENT_MISMATCH: Code block content differs from source

✗ demo/docs/invalid/symbol-errors.md
  - SYMBOL_NOT_FOUND: Symbol does not exist in file
```

## Resetting the Demo

After running `fix --auto`, the demo files will be modified. To restore them to their original state:

```bash
# Using the script (recommended)
./demo/scripts/reset-demo.sh

# Or manually
git checkout demo/docs/
```

## Exploring the Demo

1. **Start with valid examples**: Check `docs/valid/` to see correct CODE_REF usage
2. **Examine source files**: Look at the TypeScript files in `src/` to understand what's being referenced
3. **Try validation**: Run validation on different directories to see the output
4. **Test error detection**: Validate `docs/invalid/` to see how errors are reported
5. **Experiment with fix**: Run `fix --dry-run` to see what changes would be made
6. **Try real fixes**: Run `fix` on invalid files and observe the interactive prompts
7. **Reset and repeat**: Use `reset-demo.sh` to start fresh

## Troubleshooting

### "Command not found: docs-coderef"

- Make sure you've run `npm run build` first
- The tool must be built before it can be used

### "File not found" errors

- Check that you're running commands from the project root
- Paths in CODE_REF should be relative to demo directory

### "Symbol not found" errors

- Verify the symbol name matches exactly (case-sensitive)
- Check that you're referencing a TypeScript/JavaScript file
- Make sure the symbol is exported

### Validation succeeds but should fail

- Check that CODE_REF paths are correct
- Verify code blocks match source exactly (including whitespace)
- Ensure JSDoc comments are included if present in source

---

Happy testing! 🚀
