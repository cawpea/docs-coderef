# Architecture Overview

## Build System

- **tsup**: Generates both CJS and ESM formats with type declarations
- Output directory: `./dist`
- Entry points defined in package.json exports for proper dual-package support

## Module Structure

The project is organized into three main directories under `src/`:

- `cli/`: Command-line interface implementations (validate.ts, fix.ts)
- `core/`: Core validation and fixing logic
- `utils/`: Shared utility functions
