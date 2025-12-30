# Configuration

## Configuration File

Create `.coderefrc.json` in your project root:

```json
{
  "projectRoot": ".",
  "docsDir": "docs",
  "ignoreFile": ".docsignore",
  "ignorePatterns": ["**/*.draft.md"],
  "verbose": false
}
```

## Configuration Sources

The tool loads configuration from multiple sources with the following precedence (highest to lowest):

1. **Programmatic options** - Passed directly to the API
2. **Environment variables** - `CODEREF_*` prefixed variables
3. **`.coderefrc.json`** - Configuration file in project root
4. **`package.json`** - `"coderef"` field
5. **Default values** - Built-in defaults

## Configuration Options

### Base Configuration (CodeRefConfig)

#### `projectRoot`

- **Type**: `string`
- **Default**: `process.cwd()` (current working directory)
- **Description**: Root directory of your project. All paths are resolved relative to this directory.

```json
{
  "projectRoot": "."
}
```

#### `docsDir`

- **Type**: `string`
- **Default**: `"docs"`
- **Description**: Directory containing your documentation files, relative to `projectRoot`.

```json
{
  "docsDir": "documentation"
}
```

#### `ignoreFile`

- **Type**: `string` (optional)
- **Default**: `".docsignore"`
- **Description**: Path to ignore file relative to `projectRoot`. The file follows `.gitignore` syntax.

```json
{
  "ignoreFile": ".docsignore"
}
```

#### `ignorePatterns`

- **Type**: `string[]` (optional)
- **Default**: `undefined`
- **Description**: Additional glob patterns to ignore, complementing the ignore file.

```json
{
  "ignorePatterns": ["**/*.draft.md", "**/temp/**", "**/*.backup.md"]
}
```

#### `verbose`

- **Type**: `boolean` (optional)
- **Default**: `false`
- **Description**: Enable verbose logging for detailed output.

```json
{
  "verbose": true
}
```

#### `targets`

- **Type**: `string[]` (optional)
- **Default**: `undefined`
- **Description**: Specific files or directories to validate, relative to `docsDir`. If not specified, all markdown files in `docsDir` are validated.

```json
{
  "targets": ["README.md", "guides/"]
}
```

### Fix Command Configuration (CodeRefFixConfig)

The `fix` command extends the base configuration with additional options:

#### `dryRun`

- **Type**: `boolean` (optional)
- **Default**: `false`
- **Description**: Show what would be fixed without modifying files (simulation mode).

```json
{
  "dryRun": true
}
```

#### `auto`

- **Type**: `boolean` (optional)
- **Default**: `false`
- **Description**: Automatically apply all fixes without prompting for confirmation.

```json
{
  "auto": true
}
```

#### `backup`

- **Type**: `boolean` (optional)
- **Default**: `true`
- **Description**: Create backup files (`.backup` extension) before applying fixes.

```json
{
  "backup": false
}
```

## Configuration Examples

### Basic Configuration

Minimal configuration for a standard project:

```json
{
  "projectRoot": ".",
  "docsDir": "docs"
}
```

### Advanced Configuration

Configuration with custom ignore patterns and verbose output:

```json
{
  "projectRoot": ".",
  "docsDir": "documentation",
  "ignoreFile": ".docsignore",
  "ignorePatterns": ["**/*.draft.md", "**/archive/**", "**/_*.md"],
  "verbose": true
}
```

### Monorepo Configuration

Configuration for a monorepo with multiple documentation directories:

```json
{
  "projectRoot": "packages/my-package",
  "docsDir": "docs",
  "ignoreFile": "../../.docsignore"
}
```

## Environment Variables

You can override configuration using environment variables:

```bash
# Set project root
export CODEREF_PROJECT_ROOT=/path/to/project

# Set docs directory
export CODEREF_DOCS_DIR=documentation

# Set ignore file
export CODEREF_IGNORE_FILE=.customignore

# Enable verbose mode
export CODEREF_VERBOSE=true

# Run validation
npx coderef validate
```

## package.json Configuration

Alternatively, you can define configuration in `package.json`:

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "coderef": {
    "docsDir": "documentation",
    "verbose": true
  }
}
```

## Ignore Files

### .docsignore Syntax

The `.docsignore` file follows the same syntax as `.gitignore`:

```
# Ignore draft files
**/*.draft.md

# Ignore temporary directories
**/temp/
**/tmp/

# Ignore specific files
notes.md
TODO.md

# Negative patterns (don't ignore)
!important.draft.md
```

### Common Ignore Patterns

```
# Build artifacts
**/dist/
**/build/

# Temporary files
**/*.tmp
**/*.backup

# Version control
**/.git/

# Node modules
**/node_modules/

# Editor files
**/.vscode/
**/.idea/
```

## Programmatic Usage

You can also configure the tool programmatically when using the API:

```typescript
import { validate, fix } from '@cawpea/coderef';

// Validate with custom configuration
await validate({
  projectRoot: '.',
  docsDir: 'docs',
  verbose: true,
  ignorePatterns: ['**/*.draft.md'],
});

// Fix with custom configuration
await fix({
  projectRoot: '.',
  docsDir: 'docs',
  auto: true,
  backup: true,
});
```
