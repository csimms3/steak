# Architecture: Steak

## System Overview

Steak is a full-stack Next.js web application backed by PostgreSQL and a sidecar Socket.io server for real-time Crash gameplay. The Next.js app handles auth, REST endpoints, and all single-player game resolution; the WebSocket server runs the shared Crash game loop and broadcasts state to all connected clients. Both processes share the same Prisma database client and run from a single repository.

## Components

| Component | Responsibility | Technology |
|---|---|---|
| Web App | UI, routing, auth, single-player game API routes | Next.js 15 + TypeScript, App Router |
| WebSocket Server | Crash game loop: tick, broadcast, cashout, settle | Node.js + Fastify + Socket.io |
| Database | Users, balances, bets, game sessions, settings | PostgreSQL 16 + Prisma ORM |
| Cache | Active Crash game state, leaderboard cache | Redis 7 |
| Auth | Session management, JWT issuance | NextAuth.js v5 (credentials provider) |
| Game Engine | Provably fair RNG, outcome computation for all games | Shared TypeScript module (`src/lib/game-engine/`) |
| Styling | Component library, dark-mode-first design system | Tailwind CSS + shadcn/ui |

## Data Model

**User**
- `id` — UUID, primary key
- `username` — string, unique
- `email` — string, unique
- `passwordHash` — string (bcrypt, cost ≥ 12)
- `balance` — bigint (chips stored as integers, e.g. 1000 chips = 100000 in DB to avoid float math)
- `role` — enum: `player | admin`
- `createdAt` — timestamp

**GameSession** (single-player games: Dice, Mines, Plinko)
- `id` — UUID
- `userId` — FK → User
- `game` — enum: `dice | mines | plinko`
- `betAmount` — bigint
- `profit` — bigint (negative on loss)
- `multiplier` — float
- `serverSeed` — string (revealed after game)
- `serverSeedHash` — string (committed before game)
- `clientSeed` — string (player-supplied or auto-generated)
- `nonce` — integer (increments per user per game)
- `outcome` — jsonb (game-specific result, e.g. revealed tiles for Mines)
- `createdAt` — timestamp

**CrashRound** (shared multiplayer instance)
- `id` — UUID
- `crashPoint` — float (the multiplier at which it crashed)
- `serverSeed` — string (revealed after crash)
- `serverSeedHash` — string (published before round starts)
- `startedAt` — timestamp
- `endedAt` — timestamp

**CrashBet**
- `id` — UUID
- `crashRoundId` — FK → CrashRound
- `userId` — FK → User
- `betAmount` — bigint
- `cashedOutAt` — float | null (null = busted)
- `profit` — bigint
- `createdAt` — timestamp

**Settings** (admin-controlled, single-row table)
- `id` — integer (always 1)
- `defaultStartingBalance` — bigint
- `updatedAt` — timestamp

Relations:
- User has many GameSessions
- User has many CrashBets
- CrashRound has many CrashBets

## External Integrations

None. Steak is intentionally self-contained — no payment processors, no third-party game providers, no analytics SDKs, no CDN-hosted assets beyond standard npm packages. This is a deliberate non-goal.

| Service | Purpose | Auth method |
|---|---|---|
| — | — | — |

## Deployment

- **Target**: Single VPS or local machine (Docker Compose). Two processes: Next.js app + WebSocket server.
- **CI/CD**: GitHub Actions — lint, typecheck, test on every push to `main`.
- **Environments**: `local` → `production` (no staging for v0.1.0; add staging at v1.0.0).
- **Docker**: `docker-compose.yml` with services: `web` (Next.js), `ws` (Socket.io server), `postgres`, `redis`.

## Architecture Decision Records

### ADR-001: Monolith vs. Separate Services

**Status**: Accepted
**Context**: The Crash game requires a persistent WebSocket server running a continuous game loop, which doesn't fit cleanly into Next.js API routes (serverless-style, stateless). The question was whether to split into microservices or keep a single repo with two processes.
**Decision**: Single repository, two processes — Next.js app and a sidecar Socket.io server. Both share the same codebase, Prisma schema, and game-engine module. No inter-service HTTP calls needed; the WS server writes directly to Postgres.
**Consequences**: Simpler to develop, deploy, and reason about. The WS server is a single point of failure for Crash — acceptable for v0.1.0. If Crash needs horizontal scaling later, this boundary makes extraction easy.

---

### ADR-002: PostgreSQL vs. SQLite

**Status**: Accepted
**Context**: SQLite is tempting for a solo play-money project (zero infra). However, Crash involves concurrent writes from multiple players cashing out simultaneously, which requires row-level locking and proper transaction isolation.
**Decision**: PostgreSQL. Prisma makes the switch from SQLite nearly free during development, so there's no reason to pick the weaker option.
**Consequences**: Requires a running Postgres instance (handled by Docker Compose). More operational weight than SQLite, but correct behavior under concurrency is non-negotiable for a casino — even a fake one.

---

### ADR-003: Provably Fair RNG (HMAC-SHA256 Seed Chain)

**Status**: Accepted
**Context**: Casino games must be verifiably fair — players need to be able to confirm that outcomes weren't manipulated after they placed a bet. Several RNG schemes exist; the industry standard for crypto casinos is the HMAC-SHA256 seed chain.
**Decision**: Each bet uses `HMAC-SHA256(serverSeed, clientSeed:nonce)` to generate a deterministic outcome. The server commits to `SHA256(serverSeed)` (the hash) before the round begins and reveals `serverSeed` after. Players can verify any past bet independently.
**Consequences**: Adds a small amount of implementation complexity to the game engine. Provides a strong trust guarantee and is a marketable feature. The nonce prevents seed reuse across multiple bets with the same seeds.

---

### ADR-004: Integer Chip Storage (No Floats)

**Status**: Accepted
**Context**: Storing chip balances as floats (e.g. `1000.50`) causes classic floating-point rounding errors that accumulate over many bets — catastrophic for any financial system, even a fake one.
**Decision**: All balances and bet amounts are stored as bigints representing the smallest chip unit (e.g. 1 chip = 100 units). Display layer divides by 100 for rendering. All arithmetic happens in integer space.
**Consequences**: Slight cognitive overhead when reading raw DB values. Eliminates an entire class of balance-drift bugs permanently.
