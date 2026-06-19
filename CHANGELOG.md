# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- Plinko board SVG clipping (peg spacing now divides by `rows + 1`)
- `lucide-react` Turbopack RSC manifest error (added `transpilePackages`, `"use client"` on lobby)
- `BetInput` overflow in narrow panels (stacked layout)
- `clearInterval` TypeScript errors in Plinko animation refs
