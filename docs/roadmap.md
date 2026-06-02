# Roadmap: Steak

> Milestones beyond ~3 months are intentionally high-level. Plans change.

## v0.1.0 — MVP

**Goal**: A fully playable social casino with four provably fair games, real-time Crash, and a persistent chip balance — end-to-end.
**Target**: TBD

### Features
- User registration and login (credentials auth, bcrypt passwords)
- Configurable default starting balance (admin settings panel)
- Lobby page with game grid and live Crash stats
- Crash — real-time multiplayer Socket.io game with cashout
- Dice — instant single-player roll
- Mines — interactive grid reveal with incremental cashout
- Plinko — animated ball drop with row-based multiplier
- Per-bet provably fair verification (server seed commitment + reveal)
- Balance history / recent bet feed per player
- Docker Compose for local development (Postgres + Redis + app + ws)
- GitHub Actions CI (lint, typecheck, test)

### Done when
- All four games resolve correctly across 1000 simulated bets with no balance drift
- Two players can play Crash simultaneously and cash out independently without conflict
- Admin can set starting balance; new registrations receive the configured amount
- All game outcomes pass provably fair self-verification

---

## v0.2.0 — Polish & Social Layer

**Goal**: Make the lobby feel alive and give players reasons to return.
**Target**: TBD

### Features
- Global leaderboard (all-time profit)
- Live big-win feed in lobby
- Auto-bet mode for Dice and Mines (configurable rounds + stop conditions)
- Admin balance top-up for individual accounts
- Improved mobile responsiveness

### Done when
- Leaderboard updates in real time without polling
- Auto-bet runs 100 rounds without error or balance desync

---

## v1.0.0 — Stable Release

**Goal**: Production-ready. Stable public API. Full documentation. Breaking changes require a major version bump from this point.
**Target**: TBD

### Features
- Full provably fair audit history (per-user, paginated, downloadable)
- Light/dark mode toggle
- Staging environment with separate DB
- Complete CONTRIBUTING.md and developer docs
- Full test coverage on game engine and balance mutation paths

### Done when
- Full test coverage on core paths (game engine + balance mutations)
- All public APIs documented
- CONTRIBUTING.md complete with setup, test, and PR guide
- No known P0 bugs
- Zero balance drift across 100,000 simulated bets per game

---

## Backlog (v1.x+)

- Limbo game (Stake original — simple but satisfying)
- Keno game
- Referral codes and bonus chips system
- Customizable player profile (avatar, bio)
- In-game chat (lobby-level, not per-game)
- Replay viewer for Crash rounds
- PWA / installable web app
- Multi-language support (i18n)
- Webhook system for external integrations (e.g. Discord bot alerts on big wins)
