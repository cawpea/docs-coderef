# CLI Usage

Both `validate` and `fix` commands provide color-coded output with consistent formatting to help you quickly identify issues and track progress. Messages use standardized colors (errors in red, warnings in yellow, success in green, etc.) and contextual emoji indicators for improved readability.

## Validate Command

### Basic Usage

Validate all CODE_REF references in your documentation:

```bash
npx docs-coderef validate
```

### Validate Specific Files or Directories

You can specify files or directories to validate:

```bash
# Validate a specific file
npx docs-coderef validate docs/README.md

# Validate a specific directory
npx docs-coderef validate docs/backend/

# Validate multiple files/directories
npx docs-coderef validate docs/README.md docs/api/
```

### Options

- `--verbose`, `-v`: Display detailed output including reference counts per file

```bash
npx docs-coderef validate --verbose
```

## Fix Command

### Basic Usage

Fix errors interactively with colored diffs:

```bash
npx docs-coderef fix
```

This will prompt you for each error with options to apply the fix or skip.

### Options

- `--auto`: Automatically apply all fixes without prompting for confirmation

```bash
npx docs-coderef fix --auto
```

- `--dry-run`: Simulate fixes without making actual changes (useful for testing)

```bash
npx docs-coderef fix --dry-run
```

- `--backup`: Create backup files before applying fixes (default: no backup)

```bash
npx docs-coderef fix --backup
```

- `--verbose`, `-v`: Display detailed output during the fix process

```bash
npx docs-coderef fix --verbose
```

### Combining Options

You can combine multiple options:

```bash
# Auto-fix with backup
npx docs-coderef fix --auto --backup

# Dry run with verbose output
npx docs-coderef fix --dry-run --verbose
```

## Exit Codes

Both commands return appropriate exit codes:

- `0`: Success (no errors found or all fixes applied)
- `1`: Errors found (validate) or fixes failed (fix)
