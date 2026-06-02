# Document Templates

Use these templates when generating planning documents. Fill in `[TODO]` markers from the planning conversation; leave any that genuinely need the user to decide later.

---

## Requirements Template

```markdown
# Requirements: [Project Name]

## Problem Statement

[3–5 sentences: what problem this solves, who has it, and why existing solutions fall short.]

## Users

- **Primary**: [Who uses this most; what they're trying to accomplish]
- **Secondary**: [Other users, if any]

## Functional Requirements

### Must-Have (v0.1.0 MVP)

- [ ] As a [user], I want to [action] so that [outcome].
- [ ] As a [user], I want to [action] so that [outcome].
- [ ] ...

### Nice-to-Have (v1.0+)

- [ ] As a [user], I want to [action] so that [outcome].
- [ ] ...

## Non-Functional Requirements

- **Performance**: [Specific, measurable target — or N/A]
- **Reliability**: [Uptime target, error rate — or N/A]
- **Security**: [Auth model, data sensitivity, compliance — or N/A]
- **Scalability**: [User/load targets — or N/A]

## Non-Goals

This project will NOT:

- [Explicit thing excluded and why]
- [Explicit thing excluded and why]
- ...

## Scope

### v0.1.0 MVP

[List the must-have features shipping in v0.1.0. Should be the smallest slice that validates core value.]

### Repo Layout

```
[project-name]/
├── [directory]/
├── ...
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```
```

---

## Architecture Template

```markdown
# Architecture: [Project Name]

## System Overview

[2–3 sentences: what the system does at a high level and how it's structured.]

## Components

| Component | Responsibility | Technology |
|---|---|---|
| [e.g. API Server] | [what it does] | [e.g. FastAPI / Python] |
| [e.g. Database] | [what it stores] | [e.g. PostgreSQL] |
| [e.g. Frontend] | [what it renders] | [e.g. React / TypeScript] |

## Data Model

[Key entities and their relationships. A rough sketch is fine — use a list or ASCII diagram.]

**[Entity]**
- `id` — [type, description]
- `[field]` — [type, description]
- Relations: belongs to [X], has many [Y]

## External Integrations

| Service | Purpose | Auth method |
|---|---|---|
| [e.g. Stripe] | [payments] | [API key] |

## Deployment

- **Target**: [local CLI / self-hosted VPS / AWS / Vercel / etc.]
- **CI/CD**: [GitHub Actions / etc.]
- **Environments**: [local → staging → production, or simpler]

## Architecture Decision Records

### ADR-001: [Decision title]

**Status**: Accepted  
**Context**: [Why this decision needed to be made]  
**Decision**: [What was chosen]  
**Consequences**: [What this means going forward, including downsides]

---

### ADR-002: [Decision title]

**Status**: Accepted  
**Context**: [...]  
**Decision**: [...]  
**Consequences**: [...]
```

---

## Roadmap Template

```markdown
# Roadmap: [Project Name]

> Milestones beyond ~3 months are intentionally high-level. Plans change.

## v0.1.0 — MVP

**Goal**: [One sentence: what this milestone proves or delivers]  
**Target**: [Rough timeframe, or "TBD"]

### Features
- [Feature from requirements doc]
- [Feature from requirements doc]

### Done when
- [Concrete success criterion]
- [Concrete success criterion]

---

## v0.2.0 — [Theme]

**Goal**: [One sentence]  
**Target**: [Rough timeframe]

### Features
- [Feature]

### Done when
- [Criterion]

---

## v1.0.0 — Stable Release

**Goal**: Production-ready. Stable public API. Full documentation. Breaking changes require a major version bump from this point.  
**Target**: [Rough timeframe]

### Features
- [Feature]

### Done when
- Full test coverage on core paths
- All public APIs documented
- CONTRIBUTING.md complete
- No known P0 bugs

---

## Backlog (v1.x+)

- [Future idea]
- [Future idea]
```

---

## Changelog Template

```markdown
# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
### Changed
### Fixed
### Removed
### Deprecated
### Security
```

---

## README Template

```markdown
# [Project Name]

[One sentence: what this is.]

[2–3 sentences: the problem it solves and why it exists.]

## Quick Start

```bash
# Install
[install command]

# Run
[run command]
```

[Optional: screenshot or demo GIF here]

## Documentation

- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)

## License

[License name] — see [LICENSE](LICENSE) for details.
```

---

## CONTRIBUTING Template

```markdown
# Contributing to [Project Name]

## Dev Setup

```bash
# Clone
git clone [repo-url]
cd [project-name]

# Install dependencies
[TODO: install command]

# Run tests
[TODO: test command]
```

## Commit Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

| Prefix | When to use |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `chore:` | Maintenance (deps, config) |
| `refactor:` | Code change with no behavior change |
| `test:` | Adding or updating tests |
| `perf:` | Performance improvement |
| `ci:` | CI/CD changes |
| `BREAKING CHANGE:` | In the footer — signals a major version bump |

**Examples:**
```
feat: add CSV export for reports
fix: correct date parsing for non-UTC timezones
docs: add API reference for /users endpoint
chore: upgrade dependencies to latest minor versions
feat!: rename config file format from .json to .toml

BREAKING CHANGE: config files must be converted to TOML format
```

## Opening a PR

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes with conventional commits
3. Run the test suite and ensure it passes
4. Open a PR with a clear title and description
5. Link any related issues

## Questions?

Open an issue or start a discussion.
```
