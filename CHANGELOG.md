# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- Plinko animation replaced SVG CSS transitions with `requestAnimationFrame` physics (gravity + upward peg-bounce) for realistic ball behaviour
- TypeScript target bumped to ES2020 for BigInt literal support
- Dev server port set to 3001; WebSocket server port 3002
- Replaced `next/font/google` (Geist) with system font stack to eliminate blocking network call on load

### Fixed
- Plinko board SVG clipping (peg spacing now divides by `rows + 1`)
- `lucide-react` Turbopack RSC manifest error (added `transpilePackages`, `"use client"` on lobby)
- `BetInput` overflow in narrow panels (stacked layout)
- `clearInterval` TypeScript errors in Plinko animation refs
