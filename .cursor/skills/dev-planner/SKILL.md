---
name: dev-planner
description: Structured development planning skill that walks a user through turning an idea — vague or specific — into a fully documented project. Produces real planning documents: requirements, architecture, changelog, roadmap, README, and CONTRIBUTING. Use this skill whenever a user wants to plan a project, architect a system, scope features, set up versioning, write a PRD, or flesh out a development idea. Trigger on phrases like "I want to build X", "help me plan this", "let's scope this out", "how should I architect this", "I need a spec", "help me think through this idea", "set up my project docs". Also trigger when a user describes a new dev project and hasn't started planning yet. SKIP: user wants to implement/write code without planning it first; user is asking for a change to an existing well-documented project.
---

# Dev Planner

A structured workflow for turning a development idea into a complete, documented project. By the end, the user has real planning documents ready to commit — requirements, architecture, roadmap, changelog, and baseline project docs.

## Prescribed Standards

This skill is opinionated. These are non-negotiable defaults — they represent the widely-adopted high-quality baseline for software projects. Only deviate if the user has an existing conflicting standard, and name the deviation explicitly.

| Standard | Choice |
|---|---|
| Versioning | [Semantic Versioning](https://semver.org/) — MAJOR.MINOR.PATCH |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`, `ci:`, `build:`, `BREAKING CHANGE:` |
| Changelog | [Keep a Changelog](https://keepachangelog.com/) — Unreleased → Added / Changed / Fixed / Removed / Deprecated / Security |
| Architecture decisions | [ADR format](https://adr.github.io/) for any non-obvious tech choice |
| Issue tracking | GitHub Issues (mention Linear or Jira as team-scale alternatives) |

---

## Workflow

Move through phases in order. After each phase, show the user what you've produced and confirm before continuing. If the user has already answered a phase's questions, skip it.

| Phase | Output |
|---|---|
| 1. Idea Clarification | Confirmed problem statement |
| 2. Requirements | `docs/requirements.md` |
| 3. Architecture | `docs/architecture.md` |
| 4. Scoping & Structure | MVP scope + repo layout (added to requirements doc) |
| 5. Versioning & Changelog | `CHANGELOG.md` stub, Conventional Commits guide |
| 6. Roadmap | `docs/roadmap.md` |
| 7. Docs Baseline | `README.md`, `CONTRIBUTING.md` stubs |

---

## Phase 1: Idea Clarification

Start here unless the user already has a clear, detailed brief. Ask concisely — 3–4 questions in one message, not a 20-question form.

Extract:
1. **Problem** — What problem does this solve, and who has it?
2. **Users** — Who are the primary users? (themselves, a team, the public, other developers?)
3. **Success** — What does "working" look like in concrete terms?
4. **Constraints** — Hard constraints? (language, platform, must integrate with X, deadline)

After the user answers, synthesize into a 3–5 sentence problem statement and confirm it before proceeding. This statement becomes the lede of the README and requirements doc.

---

## Phase 2: Requirements

Translate the confirmed idea into structured requirements.

**Functional requirements** — write as user stories:
> As a [type of user], I want to [action], so that [outcome].

Aim for 5–10 for an MVP. Tag each as `must-have` or `nice-to-have`.

**Non-functional requirements** — be specific. "Fast" isn't a requirement; "p99 response < 200ms under 1000 concurrent users" is. Cover: performance, reliability, security, scalability — only the ones that actually apply.

**Non-goals** — explicit list of what this project will NOT do. This is the highest-leverage writing in any planning doc. It prevents scope creep, aligns expectations, and makes the requirements doc useful in arguments.

When ready, read `references/templates.md` → Requirements Template and produce `docs/requirements.md`.

---

## Phase 3: Architecture

Guide the user through key decisions. For each, present 2–3 concrete options with tradeoffs, then recommend one. Recommend the boring, proven choice unless there's a specific reason not to — novelty is a cost, not a feature.

Cover:
1. **System components** — what are the main pieces? (backend, frontend, database, queue, external services, CLI, etc.)
2. **Tech stack** — language, framework, database, hosting
3. **Data model** — key entities and relationships (rough sketch is fine)
4. **External integrations** — APIs, auth providers, third-party services
5. **Deployment target** — local tool, self-hosted, cloud (which provider and why)

**Architecture Decision Records** — for any non-obvious decision (e.g. monolith vs. microservices, PostgreSQL vs. MongoDB, REST vs. GraphQL), write a brief ADR inline:

```
## ADR-001: [Decision title]
**Status**: Accepted
**Context**: [Why this needed to be decided]
**Decision**: [What was chosen]
**Consequences**: [What this means going forward — including the downsides]
```

ADRs belong in `docs/architecture.md`. When ready, read `references/templates.md` → Architecture Template and produce that file.

---

## Phase 4: Scoping & Project Structure

**MVP scope** — define exactly what ships in v0.1.0. Pull directly from the must-have requirements. Everything else is v1.0+ or backlog. The MVP should be the smallest thing that validates the core value proposition — if it can be cut further without losing that, cut it.

**Repo layout** — propose a standard directory structure appropriate for the tech stack. Here's a generic example:

```
project-name/
├── src/
├── tests/
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   └── roadmap.md
├── scripts/
├── .github/
│   └── workflows/
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

Adapt this to the actual stack (e.g. a Python package looks different from a Next.js app). Add the finalized layout and MVP scope to `docs/requirements.md` under a `## Scope` section.

---

## Phase 5: Versioning & Changelog

Explain semver and conventional commits to the user — most devs know them in principle but not in practice:

**Semver rules:**
- `PATCH` — bug fix, no API change (`0.1.0` → `0.1.1`)
- `MINOR` — new feature, backwards compatible (`0.1.0` → `0.2.0`)
- `MAJOR` — breaking change; existing users must adapt (`0.x` → `1.0.0`)
- Start at `0.1.0`. The `0.x` range signals unstable API. `1.0.0` means "stable public contract."

**Conventional Commits** — explain why it matters: it enables automated changelogs, communicates intent in `git log`, and makes code review easier:

```
feat: add user authentication via JWT
fix: correct off-by-one error in pagination
docs: update API reference for /users endpoint
chore: bump dependency versions
refactor: extract auth middleware into separate module
test: add unit tests for UserService
perf: cache database query results for 60s
BREAKING CHANGE: rename /api/v1 routes to /api/v2
```

Read `references/templates.md` → Changelog Template and write `CHANGELOG.md`, initialized with an empty `[Unreleased]` section.

Add a short Conventional Commits guide to `CONTRIBUTING.md` (create the stub now if it doesn't exist).

---

## Phase 6: Roadmap

Define milestones. Don't plan more than ~6 months out in detail — further than that is usually fiction. Keep later milestones intentionally vague.

Standard milestone structure:
- **v0.1.0** — MVP. Core functionality working end-to-end. Not production-ready.
- **v0.x.0** — Iteration on real-world feedback. Gaps filled, rough edges smoothed.
- **v1.0.0** — Stable public API. Production-ready. Full docs. Breaking changes require a major bump from here.
- **v1.x.0+** — Feature expansion on a stable foundation.

For each milestone, write:
- Goal (one sentence)
- Features included (reference the requirements doc)
- Success criteria ("done means...")

Read `references/templates.md` → Roadmap Template and produce `docs/roadmap.md`.

---

## Phase 7: Docs Baseline

Write stubs for the two documents every project needs on day one.

**README.md** — answer in this order:
1. What is this? (one sentence)
2. Why does it exist? (the problem)
3. Quick start (get it running in < 5 commands)
4. Links to docs

**CONTRIBUTING.md** — cover:
1. Dev environment setup
2. How to run tests
3. Commit format (link to Phase 5 section or inline the table)
4. How to submit a PR

These are stubs — accurate but short. A new contributor should be oriented in 2 minutes.

Read `references/templates.md` → README Template and CONTRIBUTING Template.

---

## Document Generation

After all phases are approved by the user, write the files.

| Document | Path |
|---|---|
| Requirements | `docs/requirements.md` |
| Architecture | `docs/architecture.md` |
| Roadmap | `docs/roadmap.md` |
| Changelog | `CHANGELOG.md` |
| README | `README.md` |
| Contributing | `CONTRIBUTING.md` |

Show each draft in the conversation before writing to disk. If the user is in an existing repo, write directly. If not, write to a `planning/` directory and note they should move files when the repo is set up.

When all files are written, close with a brief summary:
- What was created
- What still needs to be filled in (marked as `[TODO]` in the docs)
- Suggested next step before writing any code (usually: create the GitHub repo, push the planning docs, open issues for each v0.1.0 feature)
