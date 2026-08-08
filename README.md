# Steak

> **Play money only. No real wagering, no real currency, no cash-out.** Steak is a social casino built purely for entertainment.

A play-money social casino with the energy of Stake.com — 15 provably fair games, a custom HMAC-SHA256 RNG engine, and real accounts with server-persisted balances, built on Next.js and Postgres.

**[Live demo](TODO: add after deploy)** · Register an account or just play as a guest — both work, see [How balance works](#how-balance-works) below.

<!-- TODO: 2-4 screenshots here once deployed — lobby, a game in progress, bet history -->

## What's here

- **15 games**: Dice, Limbo, Wheel, Flip, Keno, Diamonds, Plinko, Mines, Hilo, Dragon Tower, Blackjack, Video Poker, Crash — each with its own provably-fair engine and unit-tested payout math (114 tests).
- **Provably fair by design**: every bet commits to `SHA256(serverSeed)` before resolving and reveals `serverSeed` after, so any outcome is independently verifiable. See [`src/lib/game-engine/`](src/lib/game-engine/).
- **Real accounts, optional**: register and your balance, bet history, and game state persist server-side in Postgres. Skip it and play as a guest — balance lives in `localStorage` instead, same games, same math, nothing else changes.
- **Server-authoritative money for real accounts**: once you're logged in, the server — not the client — decides your balance. Every bet is a single atomic database transaction; a stateful game's secret data (mine positions, dealt cards, the crash point) lives server-side in a `GameRound` row instead of a client-visible blob, so it can't be read or tampered with mid-round. Details in [`docs/architecture.md`](docs/architecture.md).

## Quick Start

```bash
# Clone
git clone https://github.com/csimms3/steak.git
cd steak

# Install dependencies
npm install

# Run the app
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and start playing immediately as a guest — no setup required.

### Optional: real accounts (Postgres + auth)

To register real accounts with a server-persisted balance:

```bash
# Start local Postgres
docker compose up -d

# Point the app at it (copy the example, defaults already match docker-compose.yml)
cp .env.example .env

# Apply the schema
npx prisma migrate dev

npm run dev
```

Now `/register` creates a real account and `/login` signs in — your balance, bet history, and in-progress games persist across devices and sessions.

## How balance works

Steak runs in two modes side by side, and every game page supports both without you noticing a difference in how the game itself plays:

| | Guest | Logged in |
|---|---|---|
| Balance lives in | `localStorage` | Postgres, via the server |
| Who decides win/loss amounts | Client applies the server's computed profit | Server applies it atomically in the same request that resolves the bet |
| Stateful game secrets (mine positions, etc.) | Client-visible base64 blob | Server-side `GameRound` row, referenced by an opaque token |
| Bet history | Not tracked | `/history`, backed by `GameSession` rows |

Guest mode is the zero-friction path — clone, run, play. Logging in switches every game route onto the server-authoritative path, no separate code path to learn as a player.

## Documentation

- [Requirements](docs/requirements.md) — original problem statement and v0.1.0 scope (historical)
- [Architecture](docs/architecture.md) — current system design, data model, and ADRs
- [Roadmap](docs/roadmap.md) — what's shipped, what's next
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
