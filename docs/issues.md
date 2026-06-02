# Issues

All v0.1.0 MVP issues. Status: `open` | `in progress` | `closed`.

---

## #1 — User authentication (register, login, logout)

**Type**: `feat`
**Status**: open
**Milestone**: v0.1.0

Register with username + email + password. Login with credentials. Logout clears session. Passwords hashed with bcrypt (cost ≥ 12). Sessions managed via NextAuth.js credentials provider with JWT.

**Acceptance criteria:**
- [ ] `POST /api/auth/register` creates a user and returns a session
- [ ] `POST /api/auth/[...nextauth]` handles login/logout
- [ ] Invalid credentials return a clear error (no leaking whether user exists)
- [ ] New user receives starting balance defined by admin Settings row
- [ ] Password is never stored or returned in plaintext

---

## #2 — Provably fair game engine

**Type**: `feat`
**Status**: open
**Milestone**: v0.1.0

Core RNG module shared by all four games. Uses `HMAC-SHA256(serverSeed, clientSeed:nonce)` to derive game outcomes. Server commits to `SHA256(serverSeed)` before the round and reveals `serverSeed` after.

**Acceptance criteria:**
- [ ] `generateServerSeed()` — returns a cryptographically random 64-char hex string
- [ ] `hashServerSeed(serverSeed)` — returns `SHA256(serverSeed)` for pre-commitment
- [ ] `generateOutcome(serverSeed, clientSeed, nonce)` — returns a float in [0, 1)
- [ ] Same inputs always produce the same output (deterministic)
- [ ] `verifyBet(serverSeed, clientSeed, nonce, outcome)` — returns boolean
- [ ] Unit tests: 10,000 outcomes fall within expected distribution (chi-square)

---

## #3 — Dice game

**Type**: `feat`
**Status**: open
**Milestone**: v0.1.0

Single-player. Player sets a target, chooses over/under, and bets. Server resolves instantly using the game engine. Payout = `(100 - houseEdge) / winProbability`.

**Acceptance criteria:**
- [ ] Player can set target from 2–98 and toggle over/under
- [ ] Win probability and payout multiplier update live as target changes
- [ ] `POST /api/games/dice` validates bet, resolves outcome, updates balance atomically
- [ ] Result (roll value, win/loss, new balance) returned in response and shown in UI
- [ ] Provably fair seed commitment shown before bet; server seed revealed after
- [ ] House edge: 1%

---

## #4 — Mines game

**Type**: `feat`
**Status**: open
**Milestone**: v0.1.0

Single-player. Player selects number of mines (1–24), places a bet, then reveals tiles. Can cash out at any time for current multiplier. Hitting a mine ends the game and loses the bet.

**Acceptance criteria:**
- [ ] Player configures mine count before starting
- [ ] `POST /api/games/mines/start` — commits server seed, returns grid size
- [ ] `POST /api/games/mines/reveal` — reveals a tile; returns safe/mine + current multiplier
- [ ] `POST /api/games/mines/cashout` — settles profit, reveals full board, updates balance
- [ ] Multiplier formula follows standard Mines expected value calculation
- [ ] If player closes session mid-game, the active game is auto-cashed-out at 1× (returned bet) on next login

---

## #5 — Crash game

**Type**: `feat`
**Status**: open
**Milestone**: v0.1.0

Multiplayer real-time. A shared multiplier increases from 1× until it crashes at a provably fair point. Players bet before the round starts and cash out any time before crash. Uses Socket.io for real-time state broadcast.

**Acceptance criteria:**
- [ ] Socket.io server runs as a sidecar Node process on port 3001
- [ ] Game loop states: `waiting` (betting phase) → `in_progress` (flying) → `crashed`
- [ ] All connected clients receive `tick` events at ≥ 10 Hz during flight
- [ ] `cashout` event can only be accepted during `in_progress` state
- [ ] Crash point derived from provably fair engine; hash published during `waiting` phase
- [ ] On crash, all uncashed bets are marked as lost; balances updated in DB
- [ ] A new round starts automatically after a configurable delay (default: 5s)
- [ ] Crash history (last 10 crash points) shown in UI

---

## #6 — Plinko game

**Type**: `feat`
**Status**: open
**Milestone**: v0.1.0

Single-player. Player selects risk level (low / medium / high) and number of rows (8–16). A ball drops through a pegged board and lands in a bucket with a preset multiplier. Outcome derived from game engine.

**Acceptance criteria:**
- [ ] Player configures rows and risk before betting
- [ ] `POST /api/games/plinko` — resolves ball path (list of L/R decisions), returns bucket index and multiplier
- [ ] Ball animation in UI follows the resolved path (not random on client)
- [ ] Multiplier table matches standard Plinko payout distribution per row/risk
- [ ] Balance updated atomically server-side before animation begins

---

## #7 — Player balance and bet history

**Type**: `feat`
**Status**: open
**Milestone**: v0.1.0

Persistent chip balance displayed in the header at all times. Recent bet feed shows last 10 bets (game, amount, multiplier, profit) per player.

**Acceptance criteria:**
- [ ] Balance displayed in header, updates immediately after each bet without page reload
- [ ] `GET /api/me/balance` returns current balance
- [ ] `GET /api/me/bets?limit=10` returns recent bet history
- [ ] Recent bets panel accessible from every game page
- [ ] Balance mutations use database transactions — no partial writes

---

## #8 — Lobby page

**Type**: `feat`
**Status**: open
**Milestone**: v0.1.0

Landing page after login. Shows game cards for all four games, live current Crash multiplier (or last crash point), and a live count of active players in Crash.

**Acceptance criteria:**
- [ ] Game cards for Crash, Dice, Mines, Plinko with thumbnail and description
- [ ] Crash card shows current multiplier (if in progress) or last crash point (if waiting)
- [ ] Crash card shows number of players in current round
- [ ] Clicking a game card navigates to the game page
- [ ] Unauthenticated users are redirected to login

---

## #9 — Admin settings panel

**Type**: `feat`
**Status**: open
**Milestone**: v0.1.0

Single-page admin UI (protected by `role: admin`) to configure the default starting balance for new registrations.

**Acceptance criteria:**
- [ ] Admin role is set directly in DB (no in-app promotion UI needed for v0.1.0)
- [ ] `GET /api/admin/settings` returns current settings (admin only)
- [ ] `PATCH /api/admin/settings` updates `defaultStartingBalance` (admin only)
- [ ] Non-admin requests to `/admin/*` return 403
- [ ] Change takes effect immediately for new registrations (no restart required)

---

## #10 — Docker Compose local dev environment

**Type**: `chore`
**Status**: open
**Milestone**: v0.1.0

`docker-compose.yml` with services: `postgres`, `redis`, `web` (Next.js), `ws` (Socket.io server). Developer should be able to run `docker compose up` and have the full stack running.

**Acceptance criteria:**
- [ ] `docker compose up` starts all four services with no manual steps
- [ ] Postgres data persists across restarts via a named volume
- [ ] `.env.example` documents all required environment variables
- [ ] README quick start works verbatim on a clean clone

---

## #11 — GitHub Actions CI

**Type**: `ci`
**Status**: open
**Milestone**: v0.1.0

Run lint, typecheck, and unit tests on every push to `main` and every pull request.

**Acceptance criteria:**
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes (game engine unit tests)
- [ ] Workflow completes in < 3 minutes on a cold runner
