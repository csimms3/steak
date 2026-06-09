# Steak

A play-money social casino with the energy of Stake.com — no real wagering, just vibes and provably fair games.

Steak replicates the four signature Stake originals (Crash, Dice, Mines, Plinko) with a dark, high-contrast UI, real-time multiplayer Crash, and a configurable virtual chip system. It exists because the Stake experience is genuinely fun and there's no good open-source reference implementation of it — so here's one.

## Quick Start

```bash
# Clone
git clone https://github.com/[TODO: username]/steak.git
cd steak

# Install dependencies
npm install

# Start infrastructure
docker compose up -d

# Apply database schema
npx prisma migrate dev

# Run the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — register an account and you'll receive your starting chip balance automatically.

## Documentation

- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Contributing](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
