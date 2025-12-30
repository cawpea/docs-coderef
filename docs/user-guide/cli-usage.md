# CLI Usage

## Validate Command

### Basic Usage

Validate all CODE_REF references in your documentation:

```bash
npx coderef validate
```

### Validate Specific Files or Directories

You can specify files or directories to validate:

```bash
# Validate a specific file
npx coderef validate docs/README.md

# Validate a specific directory
npx coderef validate docs/backend/

# Validate multiple files/directories
npx coderef validate docs/README.md docs/api/
```

### Options

- `--verbose`, `-v`: Display detailed output including reference counts per file

```bash
npx coderef validate --verbose
```

## Fix Command

### Basic Usage

Fix errors interactively with colored diffs:

```bash
npx coderef fix
```

This will prompt you for each error with options to apply the fix or skip.

### Options

- `--auto`: Automatically apply all fixes without prompting for confirmation

```bash
npx coderef fix --auto
```

- `--dry-run`: Simulate fixes without making actual changes (useful for testing)

```bash
npx coderef fix --dry-run
```

- `--backup`: Create backup files before applying fixes (default: no backup)

```bash
npx coderef fix --backup
```

- `--verbose`, `-v`: Display detailed output during the fix process

```bash
npx coderef fix --verbose
```

### Combining Options

You can combine multiple options:

```bash
# Auto-fix with backup
npx coderef fix --auto --backup

# Dry run with verbose output
npx coderef fix --dry-run --verbose
```

## Exit Codes

Both commands return appropriate exit codes:

- `0`: Success (no errors found or all fixes applied)
- `1`: Errors found (validate) or fixes failed (fix)
