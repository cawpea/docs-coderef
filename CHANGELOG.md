# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Package rename**: Changed package name from `@cawpea/coderef` to `docs-coderef` (removed scope)
- **CLI command**: Changed from `coderef` to `docs-coderef`
- **Config file**: Renamed from `.coderefrc.json` to `.docs-coderefrc.json`
- **package.json field**: Changed from `"coderef"` to `"docs-coderef"`
- **Environment variables**: Changed from `CODEREF_*` to `DOCS_CODEREF_*`
- **Repository**: Renamed from `cawpea/coderef` to `cawpea/docs-coderef`

# [1.0.0](https://github.com/cawpea/docs-coderef/compare/v0.1.0...v1.0.0) (2026-01-01)


### Bug Fixes

* exclude CODE_REF comments in unclosed code blocks from validation ([f1f5287](https://github.com/cawpea/docs-coderef/commit/f1f52879dbed2d8ffaaf29fdba959e401fc81d2a))
* handle variable-length backtick sequences in code blocks ([b5674ad](https://github.com/cawpea/docs-coderef/commit/b5674add6060fbb429190ca97a02526ae16c31f2))


### Features

* remove default .docsignore value from configuration ([67967d3](https://github.com/cawpea/docs-coderef/commit/67967d3adccb5709ea8bfc2e357d8ff685831e12))


### BREAKING CHANGES

* The `ignoreFile` configuration no longer defaults to '.docsignore'.
To continue using .docsignore, explicitly set `ignoreFile: '.docsignore'` in your
configuration file (.docs-coderefrc.json or package.json).

This change makes the ignore file behavior explicit rather than implicit, applying
ignore patterns only when intentionally configured. All documentation examples now
use `.gitignore` instead of `.docsignore` to reflect this generic approach.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>

# 1.0.0 (2025-12-31)


### Bug Fixes

* add npm rebuild step to resolve rollup native binary issue in CI ([4ec06ad](https://github.com/cawpea/docs-coderef/commit/4ec06add097033d7aa6aa531e08c8e09c693b599))
* add pull-requests write permission to claude-code-review workflow ([be5b41d](https://github.com/cawpea/docs-coderef/commit/be5b41d41015aa05697099625ad484e441ba2ffe))
* add rollup as explicit devDependency to resolve CI build issue ([01061e5](https://github.com/cawpea/docs-coderef/commit/01061e519ab3f80d884810738e4396d3c47d2f53))
* clear npm cache to resolve rollup native binary issue in CI ([0cd15bd](https://github.com/cawpea/docs-coderef/commit/0cd15bd142aec85303469c8d917955711f4121c6))
* correct collectCoverageFrom pattern order in Jest config ([dbac613](https://github.com/cawpea/docs-coderef/commit/dbac61383fe0e4dbe6d3654c22615b0bab8235b3))
* prevent command injection in git-diff by using spawnSync ([105a9c2](https://github.com/cawpea/docs-coderef/commit/105a9c263a5ade19d138a0d5ec020619b62e824e))
* reinstall rollup to ensure native binaries are installed in CI ([389e7af](https://github.com/cawpea/docs-coderef/commit/389e7afaa7792b0eadf75fa9bef8e1fe0f708360))
* run npm install after npm ci to fix rollup native binary issue ([2816913](https://github.com/cawpea/docs-coderef/commit/2816913af1d10e445b2942ecf1044f39e40f25ff))
* translate remaining japanese character to english in src/utils/fix.ts ([68c57ba](https://github.com/cawpea/docs-coderef/commit/68c57babfdd5ee847af57d29b47ac28168e456cf))
* update project root to use config ([97724b3](https://github.com/cawpea/docs-coderef/commit/97724b3467d61b67917a0c8c4446dd8485482960))


### Features

* add ESLint configuration for scripts directory ([236ad04](https://github.com/cawpea/docs-coderef/commit/236ad042620d3b6ad9af2f2c57469e4e95f52f5d))
* add variable reference support in CODE_REF ([d098259](https://github.com/cawpea/docs-coderef/commit/d098259dcecf185e0743baddd0dccc4b960ea471))
* implement CLI with commander and programmatic API ([3ec29f8](https://github.com/cawpea/docs-coderef/commit/3ec29f8b18f6128e85723df6315a76ed52baacf1))
* implement configuration system ([43bf006](https://github.com/cawpea/docs-coderef/commit/43bf006df05e2fbf31301ed081c9807a5b3c2a60))
* integrate configuration system into fix.ts ([6192ccd](https://github.com/cawpea/docs-coderef/commit/6192ccdeec20c3b783b606c0de779463fad56066))
* integrate configuration system into validate.ts ([b6638ef](https://github.com/cawpea/docs-coderef/commit/b6638ef47b0c9f7019f8271776d01e041cda3969))
* migrate core logic and utils from figma-a11y-reviewer ([19efe8c](https://github.com/cawpea/docs-coderef/commit/19efe8caafc4396054ab4d37ebe79d25a9c21846))
* translate comments and logs to english in src/cli/fix.ts ([f4cd0b8](https://github.com/cawpea/docs-coderef/commit/f4cd0b89f12056a3139dfbe50bc6ff1ec9825e05))
* translate comments and messages to english in src/core/validate.ts and tests ([79f609e](https://github.com/cawpea/docs-coderef/commit/79f609e0bc22eab31bbe38a69d01e1a54e7e099b))
* translate comments and messages to english in src/utils/fix.ts and tests ([7b2dafb](https://github.com/cawpea/docs-coderef/commit/7b2dafb44a5f0cd3c0ae3f94640de7447d432339))
* translate japanese logs and comments to english ([4a20066](https://github.com/cawpea/docs-coderef/commit/4a20066692f73e453cf806ed0d2dc2ed097bf9cd))

## [Unreleased]

### Added

- Initial project setup
- Basic directory structure
- Configuration files (package.json, tsconfig.json, jest.config.js)

[unreleased]: https://github.com/cawpea/docs-coderef/compare/v0.1.0...HEAD
