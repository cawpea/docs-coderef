---
description: 'Investigate whether documentation updates are needed and update as necessary'
---

# Documentation Update Command

This command automatically updates documentation in response to code changes.

## Execution Steps

1. **Run Documentation Validation**
   - Run `npm run docs:validate` to check code changes
   - Get list of changed files

2. **Analyze Changes**
   - Check specific changes in each file
   - Identify important changes that require documentation updates

3. **Understand Current Documentation Structure**
   - Refer to `docs/development/documentation.md`

4. **Criteria for Changes Requiring Documentation Updates**
   - Refer to `docs/development/documentation.md`

5. **Update Documentation**
   - Refer to `docs/development/documentation.md`
   - Run `npm run format` to format documentation

6. **Verify**
   - Run `npm run docs:validate` to verify
   - Check diff of updated documentation

7. **Report Results to User**
   - List of updated documentation
   - Summary of main changes
   - List of files to commit

## Output Format

Present summary in the following format at the end:

```
## Completed!

### 📝 Updated Documentation

#### 1. [File Name] (+X lines, -Y lines)
- Change 1
- Change 2

### 🔍 Investigation Results

[Explanation of main changes]

### Next Steps

Review the changes and commit as necessary:
`git commit -m {commit message}`
```

## Notes

- Update CLAUDE.md only when important design policies change (usually only under `docs/`)
- No update needed for minor changes or internal implementation changes
- Type system or API specification changes must be reflected
- Ensure CODE_REF comments reference the latest code
