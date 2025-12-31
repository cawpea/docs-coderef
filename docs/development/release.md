# Release Process

This document describes the release process for `@cawpea/coderef`.

## Overview

The release process is automated using [semantic-release](https://semantic-release.gitbook.io/). It automatically determines versions based on Conventional Commits, generates CHANGELOGs, publishes to npm, and creates GitHub releases.

## Prerequisites

### Initial Setup (Repository Administrators Only)

To enable release automation, the following configuration is required:

1. **Create NPM Token**
   - Visit https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Click "Generate New Token"
   - Token type: **Automation**
   - Scope: Publish access to `@cawpea` scope

2. **Configure GitHub Secrets**
   - Go to GitHub repository Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste the npm token created above

### Developer Prerequisites

- Understanding of [Conventional Commits](https://www.conventionalcommits.org/) specification
- Familiarity with project [Git Conventions](./git-conventions.md)

## Release Methods

### Method 1: Automatic Release (Recommended)

Releases are automatically triggered when merging to the `main` branch.

#### Steps

1. **Develop on a Feature Branch**

   ```bash
   git checkout -b feature/your-feature
   # Develop and commit
   ```

2. **Follow Conventional Commits**

   ```bash
   # For new features (MINOR version bump)
   git commit -m "feat: add new validation feature"

   # For bug fixes (PATCH version bump)
   git commit -m "fix: correct reference parsing"

   # For breaking changes (MAJOR version bump)
   git commit -m "feat!: change API interface

   BREAKING CHANGE: API signature has changed"
   ```

3. **Create Pull Request for Review**

   ```bash
   git push origin feature/your-feature
   # Create PR on GitHub
   ```

4. **Merge to main Branch**
   - After PR is reviewed and approved, merge to `main` branch
   - Release workflow will automatically start after merge

5. **Verify Release Completion**
   - Check Release workflow execution in GitHub Actions
   - Verify new version is published on npm
   - Verify new release is created on GitHub Releases

### Method 2: Manual Release

You can manually trigger a release from the GitHub UI when needed.

#### Steps

1. **Open GitHub Repository Page**
   - https://github.com/cawpea/coderef

2. **Navigate to Actions Tab**
   - Click the "Actions" tab at the top

3. **Select Release Workflow**
   - Select "Release" workflow from the left sidebar

4. **Run Workflow**
   - Click the "Run workflow" button in the top right
   - Select branch (usually `main`)
   - Click "Run workflow"

5. **Verify Release Completion**
   - Check workflow execution logs
   - Verify on npm and GitHub Releases

**Note**: Due to semantic-release configuration, releases will only be created from the `main` branch.

## Release Process Details

### Executed Operations

When the Release workflow runs, the following operations are executed sequentially:

1. **Checkout Code**
   - Fetch complete Git history (`fetch-depth: 0`)

2. **Quality Checks**
   - Build (`npm run build`)
   - Tests (`npm test`)
   - Lint (`npm run lint`)
   - Type check (`npm run type-check`)

3. **Run semantic-release**
   - Commit analysis (analyze commits since last release)
   - Version determination (based on commit types)
   - Update CHANGELOG.md
   - Update package.json version
   - Publish package to npm
   - Create GitHub release
   - Commit changes and create tag

### Version Determination Rules

Versions are automatically determined based on commit messages:

| Commit Type                    | Example                 | Version Change        |
| ------------------------------ | ----------------------- | --------------------- |
| `feat:`                        | `feat: add new feature` | MINOR (0.1.0 → 0.2.0) |
| `fix:`                         | `fix: resolve bug`      | PATCH (0.1.0 → 0.1.1) |
| `BREAKING CHANGE:`             | In footer               | MAJOR (0.1.0 → 1.0.0) |
| `feat!:` or `fix!:`            | `feat!: change API`     | MAJOR (0.1.0 → 1.0.0) |
| `docs:`, `chore:`, `ci:`, etc. | -                       | No release            |

See [Git Conventions](./git-conventions.md) for more details.

### Generated Artifacts

When a release succeeds, the following are automatically created:

1. **npm Package**
   - https://www.npmjs.com/package/@cawpea/coderef
   - New version is published

2. **Git Tag**
   - Format: `vX.Y.Z` (e.g., `v0.2.0`)
   - Created on `main` branch

3. **GitHub Release**
   - Auto-generated release notes
   - Changelog based on commits

4. **CHANGELOG.md**
   - New version entry is added
   - Maintains Keep a Changelog format

5. **Version Bump Commit**
   - Commit message: `chore(release): X.Y.Z [skip ci]`
   - `[skip ci]` prevents workflow from re-running on this commit

## Verifying Releases

After a release, verify the following:

### 1. Check GitHub Actions

- Visit https://github.com/cawpea/coderef/actions
- Verify Release workflow completed successfully
- Ensure all steps have green checkmarks

### 2. Check npm Package

```bash
# Check latest version
npm view @cawpea/coderef version

# Test package installation
npm install @cawpea/coderef@latest
```

### 3. Check GitHub Release

- Visit https://github.com/cawpea/coderef/releases
- Verify new release was created
- Verify release notes are correctly generated

### 4. Check CHANGELOG.md

- Review CHANGELOG.md in the repository
- Verify new version entry was added
- Verify changes are correctly documented

### 5. Check Git Tags

```bash
# List all tags
git tag -l

# Check latest tag
git describe --tags --abbrev=0
```

## Troubleshooting

### Release Not Triggered

**Symptom**: No release is created after merging to `main` branch

**Causes and Solutions**:

1. **No Releasable Commits**
   - If only `docs:`, `chore:`, `ci:` commits exist, no version bump occurs
   - Check semantic-release logs: "no release" message indicates this is normal

2. **Quality Check Failure**
   - Release is aborted if build, tests, lint, or type check fails
   - Check GitHub Actions logs for errors and fix them

3. **NPM_TOKEN Misconfiguration**
   - Verify `NPM_TOKEN` is correctly set in GitHub Secrets
   - Verify token has appropriate permissions (Automation token, Publish access)

### npm Publication Failure

**Symptom**: Release workflow succeeds but package is not published to npm

**Causes and Solutions**:

1. **Authentication Error**
   - Check NPM_TOKEN expiration
   - Regenerate token and update GitHub Secrets

2. **Package Name Conflict**
   - Verify package with same name doesn't already exist on npm
   - For scoped packages (`@cawpea/coderef`), verify `publishConfig.access: "public"` is set

3. **Network Error**
   - May be a temporary error
   - Manually re-run the workflow

### GitHub Release Creation Failure

**Symptom**: Package is published to npm but GitHub Release is not created

**Causes and Solutions**:

1. **Insufficient Permissions**
   - Check `permissions` settings in Release workflow
   - Verify `contents: write` is set

2. **GITHUB_TOKEN Issue**
   - Verify `GITHUB_TOKEN` is correctly set in workflow
   - If `persist-credentials: false`, additional token configuration may be needed

### Manual Execution Doesn't Release

**Symptom**: Manual execution shows "no release"

**Causes and Solutions**:

1. **Branch Verification**
   - Verify you're not running from a branch other than `main`
   - Check `branches` configuration in `.releaserc.json`

2. **Commit History Verification**
   - Verify there are releasable commits (`feat:`, `fix:`, etc.) since last release

## Rollback Procedures

Procedures for rolling back a release when issues occur.

### Unpublish npm Package

**Warning**: npm allows unpublish within 72 hours of publication.

```bash
# Unpublish package version (within 72 hours)
npm unpublish @cawpea/coderef@X.Y.Z

# Or deprecate package (after 72 hours)
npm deprecate @cawpea/coderef@X.Y.Z "This version has critical issues. Please use vX.Y.Z-1 instead."
```

### Delete GitHub Release

1. **Delete from GitHub UI**
   - Visit https://github.com/cawpea/coderef/releases
   - Open the relevant release
   - Click "Delete" button

2. **Delete from CLI**
   ```bash
   gh release delete vX.Y.Z
   ```

### Delete Git Tag

```bash
# Delete local tag
git tag -d vX.Y.Z

# Delete remote tag
git push --delete origin vX.Y.Z
```

### Revert Release Commit

```bash
# Switch to main branch
git checkout main
git pull origin main

# Identify release commit
git log --oneline | grep "chore(release)"

# Revert release commit (undo with new commit)
git revert <commit-sha>

# Push to remote
git push origin main
```

**Warning**: Use `git revert` to preserve history while undoing changes. Avoid `git reset --hard` on shared repositories as it rewrites history.

### Emergency Patch Release

Steps to release a fixed version after rolling back a problematic release:

1. **Create Fix Branch**

   ```bash
   git checkout -b hotfix/critical-fix
   ```

2. **Fix the Issue**

   ```bash
   # Make fixes
   git add .
   git commit -m "fix: resolve critical issue in vX.Y.Z"
   ```

3. **Create PR and Merge**
   - Follow normal release process
   - PATCH version will automatically increment due to `fix:` commit

## Best Practices

### Commit Messages

- Strictly follow Conventional Commits specification
- Use scopes to clarify where changes were made
  ```bash
  feat(cli): add --verbose option
  fix(parser): handle edge case in CODE_REF
  ```

### Pre-Release Verification

- Test thoroughly locally
- Verify CI passes before merging
- Update documentation for breaking changes

### Post-Release Verification

- Verify publication on npm package page
- Review release notes on GitHub Releases
- Manually supplement release notes if needed

### Version Management

- Follow Semantic Versioning
- Before 1.0.0 (0.x.x), MINOR versions may include breaking changes
- From 1.0.0 onwards, breaking changes must increment MAJOR version

## References

- [semantic-release Documentation](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Git Conventions](./git-conventions.md)
- [npm Documentation](https://docs.npmjs.com/)
