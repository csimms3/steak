# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Real accounts and server-authoritative balance** — registration and login (next-auth v5, Credentials provider, bcrypt, JWT sessions); every one of the 13 games now settles through an atomic database transaction (`src/lib/game-balance.ts`) when logged in, with balance, bet history, and in-progress game state persisted in Postgres. Guest mode (no account) is unchanged — same `localStorage`-backed balance, same games, same math.
- **Bet history** (`/history`) — paginated, most-recent-first record of every resolved bet, backed by a new `GameSession` table
- **Secure server-side round state** (`GameRound`) for the 6 stateful games (Mines, Hilo, Dragon Tower, Blackjack, Video Poker, Crash) — authenticated play now keeps secret in-progress data (mine positions, dealt cards, the crash point) server-side instead of in the client-visible base64 blob those games previously relied on for all play. Closes a real integrity gap: the blob was unsigned and readable by anyone who decoded it.
- **Crash cashout security fix** — the server previously trusted whatever `cashedOutAt` a client reported at cashout outright; a client that already knew `crashPoint` (necessarily visible for the client-side countdown animation) could claim near-maximum profit with zero elapsed time, on every round. Now validated against real server-side elapsed time via `crashMultiplierAtElapsed()`. Documented residual gap: a scripted client that waits the correct real time before claiming still isn't fully preventable without a real-time multiplayer round loop (out of scope, see `docs/roadmap.md`).
- Prisma schema rewritten to cover all 13 games (previously only listed `dice | mines | plinko` from the original scaffold); unused `CrashRound`/`CrashBet` models (for a multiplayer round concept never built) removed
- **Blackjack** — standard rules: hit/stand/double/split (one split, no resplit), dealer stands on soft 17, 3:2 blackjack payout, push on ties
- **Video Poker** — Jacks or Better, standard 9/6 paytable; deal 5, hold any subset, draw replacements, pay by final hand rank
- **Hilo** — deal a card, guess higher or lower on each next card; step multiplier is 0.99/P(win) based on exact rank distribution; cashout any time; bust reveals server seed
- **Dragon Tower** — 9-row grid, pick the egg and avoid the dragon each row; 4 difficulties (Easy/Medium/Hard/Expert) from 1.32× to 2.97× per row; cashout reveals all dragon positions
- **Keno** — pick 1–10 tiles from a 40-number grid; server draws 10 distinct tiles via provably-fair Fisher-Yates; payout by hit count per pick tier (~96% RTP); 8×5 grid UI with hit/miss/drawn color coding and live payout table
- **Diamonds** — pick 4 tiles from a 3×4 grid; server hides 3 diamonds; 0.4×/2×/18× for 1/2/3 hits (~96.5% RTP); reveal animation shows all 12 gem types
- Game library expansion (v0.3.0) foundation: shared provably-fair card engine (`src/lib/game-engine/cards.ts`) with 52-card shuffle and blackjack/baccarat/poker hand evaluators; reusable game-state codec (`src/lib/game-engine/state.ts`); shared UI primitives (`GameShell`, `PlayingCard`, `ResultBanner`)
- Mobile header home link — ⚡ STEAK logo in the header is now a `Link` to `/` (sidebar is hidden below `md`, so this was the only way to navigate home on narrow viewports)
- **Limbo** — set a target multiplier and beat a provably-fair result (1% edge), animated count-up + recent-results strip
- **Wheel** — canvas spin wheel with low/medium/high risk and 10–50 segments (~0.96 RTP), pointer-aligned landing
- **Flip** — pick a side and chain a target streak (1–10) at 1.98× per flip, sequential coin reveal
- Full casino UI: lobby, Dice, Mines, Plinko, Crash game pages
- Provably fair game engine (`src/lib/game-engine/`) — HMAC-SHA256 seed chain for Dice, Crash, Mines, Plinko
- Mock chip balance via React Context (`BalanceContext`) — no auth required for MVP
- Plinko multi-ball drop selector (1, 3, 5, 10, 25, 100 balls at once)
- Plinko board: canvas-based physics simulation with gravity, per-peg bounce, simultaneous ball animation
- Dice track: visual win/lose zone indicator with animated result marker
- Mines: interactive 5×5 grid with mine count control and cashout
- Crash: real-time multiplier ticker with client-side animation and cashout
- Docker Compose for local Postgres + Redis
- GitHub Actions CI (lint, typecheck, test)
- Unit tests for game engine (`src/__tests__/game-engine.test.ts`)
- `BetInput` component with ½ / 2× / Max quick-adjust buttons
- Sidebar navigation and Header with balance display + reset

### Changed
- Game pages now use full-width layout (`GameShell` dropped `max-w-2xl`); Limbo, Wheel, and Flip use `flex-col` on mobile and `lg:flex-row` (≥1024px) for side-by-side display+controls; Dice drops `max-w-xl`
- Plinko animation replaced SVG CSS transitions with `requestAnimationFrame` physics (gravity + upward peg-bounce) for realistic ball behaviour
- TypeScript target bumped to ES2020 for BigInt literal support
- Dev server port set to 3001; WebSocket server port 3002
- Replaced `next/font/google` (Geist) with system font stack to eliminate blocking network call on load

### Fixed
- Crash bust settlement scored as a win at exactly the crash point — the server's bust-check is `cashedOutAt > crashPoint` (strictly greater), and the initial fix for the cashout exploit above sent `cashedOutAt === crashPoint` to signal a bust, which slipped through as a break-even win instead. Replaced with an explicit `bust` boolean rather than a numeric sentinel.
- README/CONTRIBUTING/architecture docs described a backend (auth, Postgres, real-time Crash via Socket.io/Redis) that was never built — `docker-compose.yml`, the Prisma schema, and `next-auth`/`@prisma/client` sat in `package.json` fully unwired since the original scaffold. Docs now describe what's actually built; the unwired dependencies are wired up as part of this same change.
- `BalanceContext`'s lazy `useState` initializer read real `localStorage` during the client's first render, which can never match the server's SSR render — any returning guest with a non-default saved balance triggered a full-tree hydration error on every page load. Fixed by starting from the SSR-safe default and adopting the real value in an effect immediately after mount.
- Plinko board SVG clipping (peg spacing now divides by `rows + 1`)
- `lucide-react` Turbopack RSC manifest error (added `transpilePackages`, `"use client"` on lobby)
- `BetInput` overflow in narrow panels (stacked layout)
- `clearInterval` TypeScript errors in Plinko animation refs
