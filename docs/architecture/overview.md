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

## Core Validation Logic

### CODE_REF Extraction (src/core/validate.ts)

The validation system extracts CODE_REF comments from markdown files while intelligently excluding references that appear inside code blocks or inline code. This ensures that documentation examples showing CODE_REF syntax are not mistakenly validated.

#### Code Block Detection Algorithm

The code block detection uses a sophisticated pairing algorithm to handle various markdown code block formats:

1. **Backtick Sequence Detection**: Scans the entire document to find all sequences of 3 or more consecutive backticks
2. **Length-Based Pairing**: Matches opening and closing backtick sequences with identical lengths
   - ` ``` ` pairs with ` ``` ` (3 backticks)
   - ` ```` ` pairs with ` ```` ` (4 backticks)
   - ` ````` ` pairs with ` ````` ` (5 backticks)
3. **Unclosed Block Handling**: Treats any unpaired backtick sequence as an unclosed code block extending to the end of the file
4. **Inline Code Detection**: Separately detects single-backtick inline code using pattern matching

This algorithm correctly handles:

- Nested code blocks with different backtick lengths
- Markdown examples that show code block syntax
- Unclosed code blocks (common in draft documentation)
- Mixed inline code and code blocks

#### Validation Process

<!-- CODE_REF: src/core/validate.ts#extractCodeRefs -->

The `extractCodeRefs` function:

1. Pre-computes all code block and inline code ranges in the document
2. Finds all CODE_REF comment patterns
3. Filters out CODE_REF comments that fall within code block ranges
4. Returns only CODE_REF comments that should be validated
