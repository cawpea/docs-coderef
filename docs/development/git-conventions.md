# Git Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages.

## Commit Message Format

```
<type>: <description>

[optional body]

[optional footer]
```

## Commit Types

| Type       | Description                                                     | Semantic Version Impact | Examples                                 |
| ---------- | --------------------------------------------------------------- | ----------------------- | ---------------------------------------- |
| `feat`     | New feature                                                     | MINOR (1.x.0)           | Add evaluation agent, new UI component   |
| `fix`      | Bug fix                                                         | PATCH (1.0.x)           | Fix contrast ratio calculation error     |
| `docs`     | Documentation only changes                                      | None                    | Update README, add comments              |
| `style`    | Changes that don't affect code meaning (whitespace, formatting) | None                    | Run Prettier, fix indentation            |
| `refactor` | Code changes that neither fix bugs nor add features             | None                    | Split function, rename variables         |
| `test`     | Adding or updating tests                                        | None                    | Add unit tests, improve mocks            |
| `chore`    | Changes to build process or tools                               | None                    | Update dependencies, modify config files |
| `ci`       | Changes to CI configuration files and scripts                   | None                    | Update GitHub Actions                    |
| `perf`     | Performance improvements                                        | PATCH (1.0.x)           | Optimize API response time               |
| `build`    | Changes to build system or external dependencies                | None                    | Modify Webpack config, add npm scripts   |
| `revert`   | Revert a previous commit                                        | Depends on original     | Revert previous commit                   |
