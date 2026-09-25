import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateServerSeed, generateClientSeed, hashServerSeed } from "@/lib/game-engine/rng";
import { settleBet, type Tx } from "@/lib/game-balance";

/**
 * Per-player provably-fair seed pairs.
 *
 * Why this makes outcomes provable: every bet resolves against the user's
 * `active` pair, whose serverSeedHash was published before the bet existed, so
 * the server can't pick a seed with the bet in view. Rotation reveals the active
 * seed and promotes the `next` pair, whose hash was published before the player
 * chose the client seed it gets paired with, so the server can't grind the new
 * seed against that choice either. Generating the new seed inside the rotate
 * request would reintroduce exactly that hole.
 */

export class RotationBusyError extends Error {
  constructor() {
    super("Your seeds are busy (a game action or another rotation is in progress). Try again in a moment.");
    this.name = "RotationBusyError";
  }
}

// A round claimed more recently than this is assumed to have a request still
// working on it; rotation refuses rather than forfeiting it underneath that
// request (which could then settle it a second time). Older claims belong to
// requests that died without releasing, and are forfeited like any open round.
const LIVE_CLAIM_MS = 30_000;

export const CLIENT_SEED_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

export interface SeedState {
  active: { id: string; serverSeedHash: string; clientSeed: string; nonce: number };
  nextServerSeedHash: string;
}

export interface AllocatedSeeds {
  seedPairId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  /** First nonce of the allocated range; the range is [firstNonce, firstNonce + count). */
  firstNonce: number;
}

function newPair(userId: string, status: "active" | "next") {
  const serverSeed = generateServerSeed();
  return {
    userId,
    status,
    serverSeed,
    serverSeedHash: hashServerSeed(serverSeed),
    clientSeed: status === "active" ? generateClientSeed() : null,
    activatedAt: status === "active" ? new Date() : null,
  };
}

/**
 * Creates the user's active and next pairs if missing. `skipDuplicates` turns a
 * concurrent first request's insert into a no-op via the partial unique indexes,
 * so two racing requests can't give a user two active pairs.
 */
async function ensurePairs(tx: Tx, userId: string): Promise<void> {
  const existing = await tx.seedPair.findMany({
    where: { userId, status: { in: ["active", "next"] } },
    select: { status: true },
  });
  const have = new Set(existing.map((p) => p.status));
  const missing = (["active", "next"] as const).filter((s) => !have.has(s));
  if (missing.length === 0) return;
  await tx.seedPair.createMany({ data: missing.map((s) => newPair(userId, s)), skipDuplicates: true });
}

async function readState(tx: Tx, userId: string): Promise<SeedState> {
  const pairs = await tx.seedPair.findMany({ where: { userId, status: { in: ["active", "next"] } } });
  const active = pairs.find((p) => p.status === "active");
  const next = pairs.find((p) => p.status === "next");
  if (!active || !next) throw new Error("seed pairs missing after ensurePairs");
  return {
    active: { id: active.id, serverSeedHash: active.serverSeedHash, clientSeed: active.clientSeed!, nonce: active.nonce },
    nextServerSeedHash: next.serverSeedHash,
  };
}

/** Public view of the user's seeds (hashes only), creating them on first use. */
export async function getSeedState(userId: string): Promise<SeedState> {
  return prisma.$transaction(async (tx) => {
    await ensurePairs(tx, userId);
    return readState(tx, userId);
  });
}

export async function getRevealedPairs(userId: string, take = 10) {
  return prisma.seedPair.findMany({
    where: { userId, status: "revealed" },
    orderBy: { revealedAt: "desc" },
    take,
    select: { id: true, serverSeed: true, serverSeedHash: true, clientSeed: true, nonce: true, revealedAt: true },
  });
}

/**
 * Takes `count` consecutive nonces from the user's active pair. Must run inside
 * the same transaction that settles the bet (or creates the round), so a
 * concurrent rotation either sees the bet or happens entirely before it.
 *
 * The increment is a guarded UPDATE, which row-locks the active pair until the
 * transaction ends: rotation (which starts by updating the same row) waits for
 * in-flight bets, and a bet that waited on a rotation finds no active row and
 * retries against the newly promoted one.
 */
export async function allocateNonces(tx: Tx, userId: string, count = 1): Promise<AllocatedSeeds> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const bumped = await tx.seedPair.updateMany({
      where: { userId, status: "active" },
      data: { nonce: { increment: count } },
    });
    if (bumped.count === 1) {
      const pair = await tx.seedPair.findFirstOrThrow({ where: { userId, status: "active" } });
      return {
        seedPairId: pair.id,
        serverSeed: pair.serverSeed,
        serverSeedHash: pair.serverSeedHash,
        clientSeed: pair.clientSeed!,
        firstNonce: pair.nonce - count,
      };
    }
    await ensurePairs(tx, userId);
  }
  throw new Error("could not allocate a nonce from the active seed pair");
}

interface ForfeitablePayload {
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  seedPairId?: string;
}

export interface RotationResult {
  revealed: { id: string; serverSeed: string; serverSeedHash: string; clientSeed: string; nonce: number };
  state: SeedState;
  forfeited: number;
}

/**
 * Reveals the active pair and promotes `next` with the given (or a random)
 * client seed. Open rounds are forfeited as losses first: revealing the seed
 * would otherwise expose their outcome (mine positions, deck order) mid-round,
 * and refunding would let a player cancel a round they can see going badly.
 */
export async function rotateSeedPair(userId: string, clientSeed?: string): Promise<RotationResult> {
  if (clientSeed !== undefined && !CLIENT_SEED_PATTERN.test(clientSeed)) {
    throw new Error("invalid client seed");
  }

  return prisma.$transaction(async (tx) => {
    await ensurePairs(tx, userId);

    // Lock the active row first: in-flight bets holding it finish before we go
    // on. The status guard makes a concurrent rotation that got there first a
    // no-op here rather than a second reveal.
    const now = new Date();
    const active = await tx.seedPair.findFirstOrThrow({ where: { userId, status: "active" } });
    const locked = await tx.seedPair.updateMany({
      where: { id: active.id, status: "active" },
      data: { status: "revealed", revealedAt: now },
    });
    if (locked.count !== 1) throw new RotationBusyError();
    // Re-read after the lock: bets that were holding it may have advanced the nonce.
    const revealed = await tx.seedPair.findUniqueOrThrow({ where: { id: active.id } });

    const rounds = await tx.gameRound.findMany({ where: { userId } });
    if (rounds.some((r) => r.claimedAt && now.getTime() - r.claimedAt.getTime() < LIVE_CLAIM_MS)) {
      throw new RotationBusyError();
    }
    for (const round of rounds) {
      const p = (round.payload ?? {}) as ForfeitablePayload;
      await settleBet(
        {
          userId,
          game: round.game,
          betAmount: round.betAmount,
          profit: -round.betAmount,
          multiplier: 0,
          serverSeed: p.serverSeed ?? "",
          serverSeedHash: p.serverSeedHash ?? (p.serverSeed ? hashServerSeed(p.serverSeed) : ""),
          clientSeed: p.clientSeed ?? "",
          nonce: p.nonce ?? 0,
          outcome: { forfeited: "seed rotation" } as Prisma.InputJsonValue,
          reserved: true,
          seedPairId: p.seedPairId,
        },
        tx
      );
      await tx.gameRound.delete({ where: { id: round.id } });
    }

    await tx.seedPair.updateMany({
      where: { userId, status: "next" },
      data: { status: "active", clientSeed: clientSeed ?? generateClientSeed(), activatedAt: now },
    });
    await tx.seedPair.create({ data: newPair(userId, "next") });

    return {
      revealed: {
        id: revealed.id,
        serverSeed: revealed.serverSeed,
        serverSeedHash: revealed.serverSeedHash,
        clientSeed: revealed.clientSeed!,
        nonce: revealed.nonce,
      },
      state: await readState(tx, userId),
      forfeited: rounds.length,
    };
  });
}
