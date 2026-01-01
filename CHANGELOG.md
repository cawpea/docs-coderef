# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# [1.0.0](https://github.com/cawpea/docs-coderef/compare/v0.1.0...v1.0.0) (2026-01-01)


### Bug Fixes

* exclude CODE_REF comments in unclosed code blocks from validation ([f1f5287](https://github.com/cawpea/docs-coderef/commit/f1f52879dbed2d8ffaaf29fdba959e401fc81d2a))
* handle variable-length backtick sequences in code blocks ([b5674ad](https://github.com/cawpea/docs-coderef/commit/b5674add6060fbb429190ca97a02526ae16c31f2))


### Features

* remove default .docsignore value from configuration ([67967d3](https://github.com/cawpea/docs-coderef/commit/67967d3adccb5709ea8bfc2e357d8ff685831e12))


### BREAKING CHANGES

* The `ignoreFile` configuration no longer defaults to '.docsignore'.
To continue using .docsignore, explicitly set `ignoreFile: '.docsignore'` in your
configuration file (.coderefrc.json or package.json).

This change makes the ignore file behavior explicit rather than implicit, applying
ignore patterns only when intentionally configured. All documentation examples now
use `.gitignore` instead of `.docsignore` to reflect this generic approach.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

## [Unreleased]

### Changed

- **Package rename**: Changed package name from `@cawpea/coderef` to `docs-coderef` (removed scope)
- **CLI command**: Changed from `coderef` to `docs-coderef`
- **Config file**: Renamed from `.coderefrc.json` to `.docs-coderefrc.json`
- **package.json field**: Changed from `"coderef"` to `"docs-coderef"`
- **Environment variables**: Changed from `CODEREF_*` to `DOCS_CODEREF_*`
- **Repository**: Renamed from `cawpea/coderef` to `cawpea/docs-coderef`

### Added

- Initial project setup
- Basic directory structure
- Configuration files (package.json, tsconfig.json, jest.config.js)

[unreleased]: https://github.com/cawpea/docs-coderef/compare/v0.1.0...HEAD
