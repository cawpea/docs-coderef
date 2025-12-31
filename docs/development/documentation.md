# Documentation Guidelines

This guide explains how to write and maintain documentation for the @cawpea/coderef project.

## Documentation Structure

All documentation lives in the `docs/` directory and follows a three-tier structure:

```
docs/
├── README.md              # Documentation index and navigation
├── user-guide/            # End-user documentation
├── development/           # Contributor guides
└── architecture/          # Technical deep-dives
```

## Markdown Style Guide

### Headers

Use ATX-style headers (`#`) with a space after the hash:

```markdown
# H1 - Document Title

## H2 - Major Section

### H3 - Subsection
```

- Each document should have exactly one H1 at the top
- Use H2 for major sections, H3 for subsections
- Avoid skipping header levels (don't jump from H2 to H4)

### Code Blocks

Always specify the language for syntax highlighting:

````markdown
```bash
npm run build
```

```typescript
function example(): void {
  console.log('Hello');
}
```
````

For command-line examples, use:

- `bash` for shell commands
- `typescript` for TypeScript code
- `javascript` for JavaScript code
- `json` for JSON configuration
- `markdown` for markdown examples

### Lists

Use consistent formatting:

```markdown
- Unordered lists use hyphens (-)
- Not asterisks (\*) or plus (+)
- Keep items concise

1. Ordered lists use numbers
2. Start from 1 and increment
3. Use for sequential steps
```

### Links

#### Internal Links

Use relative paths from the current file:

```markdown
[Coding Standards](coding-standards.md)
[Architecture Overview](../architecture/overview.md)
[Main README](../../README.md)
```

#### External Links

Provide descriptive link text:

```markdown
Good: [Conventional Commits specification](https://www.conventionalcommits.org/)
Bad: Click [here](https://www.conventionalcommits.org/)
```

### Emphasis

- **Bold** for UI elements, file names, important terms: `**package.json**`
- _Italic_ for emphasis or introducing new terms: `*CODE_REF comments*`
- `Code` for inline code, commands, values: `` `npm install` ``

## Using CODE_REF in Documentation

Since this project validates CODE_REF comments in markdown, follow these practices:

### Example Code with CODE_REF

When showing code examples that reference actual source code, use CODE_REF comments:

````markdown
```typescript
// CODE_REF: src/utils/parser.ts#parseCodeRef
export function parseCodeRef(comment: string): CodeRef {
  // Implementation
}
```
````

### Explaining CODE_REF Syntax

When documenting CODE_REF syntax itself, use markdown code blocks:

````markdown
The basic syntax is:

```
// CODE_REF: <file-path>#<symbol-name>
```
````

### Best Practices for CODE_REF

- Use CODE_REF when showing actual implementation code
- Keep referenced code snippets short and focused
- Update documentation when refactoring referenced code

## Common Mistakes to Avoid

- Don't use `<br>` tags (use blank lines)
- Don't mix list markers (stick to `-` for unordered lists)
- Don't forget language specifiers in code blocks
- Don't use relative links that go outside the repository
- Don't commit documentation without testing examples
- Don't use inline HTML when markdown suffices
- Don't forget to update `docs/README.md` when adding new documents
