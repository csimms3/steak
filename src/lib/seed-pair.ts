import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateServerSeed, hashServerSeed } from "@/lib/game-engine/rng";
import { settleBet, type Tx } from "@/lib/game-balance";

/**
 * Per-player provably-fair seed pairs.
 *
 * The server only ever creates a `next` pair on its own, in a request that
 * carries no client seed and no bet (registration, or a plain GET of the seed
 * state). Its hash is committed from then on. A pair becomes `active` only
 * through rotation, which pairs it with a client seed the player supplies, so
 * the server fixed its seed before the client seed existed. Every bet then
 * resolves against the active pair with the next nonce, after both halves were
 * fixed. Rotation reveals the old active seed so past bets can be checked.
 *
 * Two shortcuts would each reopen the hole and are deliberately absent:
 * generating a client seed server-side (the server could grind it against the
 * known next seed), and creating a pair inside a bet or rotate request (its
 * hash would never have been published before that request's inputs).
 */

export class RotationBusyError extends Error {
  constructor() {
    super("Your seeds are busy (a game action or another rotation is in progress). Try again in a moment.");
    this.name = "RotationBusyError";
  }
}

/** Rotation needs a `next` pair committed by an earlier request; one now exists, so retry. */
export class SeedsNotReadyError extends Error {
  constructor() {
    super("Your next server seed was just committed. Review its hash and try again.");
    this.name = "SeedsNotReadyError";
  }
}

/** Bets need an active pair, which only exists once the player has chosen a client seed. */
export class NoActiveSeedPairError extends Error {
  constructor() {
    super("Choose a client seed before playing.");
    this.name = "NoActiveSeedPairError";
  }
}

export const CLIENT_SEED_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

export interface SeedState {
  active: { id: string; serverSeedHash: string; clientSeed: string; nonce: number } | null;
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

/** A fresh `next` pair (no client seed). Also used for the nested create at registration. */
export function nextPairData() {
  const serverSeed = generateServerSeed();
  return { status: "next" as const, serverSeed, serverSeedHash: hashServerSeed(serverSeed) };
}

/**
 * Creates the user's `next` pair if missing and reports whether it already
 * existed. `skipDuplicates` plus the partial unique index turn a concurrent
 * request's insert into a no-op, so a user never gets two.
 */
async function ensureNext(tx: Tx, userId: string): Promise<boolean> {
  const existing = await tx.seedPair.findFirst({ where: { userId, status: "next" }, select: { id: true } });
  if (existing) return true;
  await tx.seedPair.createMany({ data: [{ userId, ...nextPairData() }], skipDuplicates: true });
  return false;
}

async function readState(tx: Tx, userId: string): Promise<SeedState> {
  const pairs = await tx.seedPair.findMany({ where: { userId, status: { in: ["active", "next"] } } });
  const active = pairs.find((p) => p.status === "active");
  const next = pairs.find((p) => p.status === "next");
  if (!next) throw new Error("next seed pair missing after ensureNext");
  return {
    active: active
      ? { id: active.id, serverSeedHash: active.serverSeedHash, clientSeed: active.clientSeed!, nonce: active.nonce }
      : null,
    nextServerSeedHash: next.serverSeedHash,
  };
}

/** Public view of the user's seeds (hashes only). Commits a `next` pair on first call. */
export async function getSeedState(userId: string): Promise<SeedState> {
  return prisma.$transaction(async (tx) => {
    await ensureNext(tx, userId);
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
 * retries once against the newly promoted one. Never creates a pair.
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
  }
  throw new NoActiveSeedPairError();
}

interface ForfeitablePayload {
  nonce?: number;
  seedPairId?: string;
}

export interface RotationResult {
  /** Null on first activation, when there was no active pair to reveal. */
  revealed: { id: string; serverSeed: string; serverSeedHash: string; clientSeed: string; nonce: number } | null;
  state: SeedState;
  forfeited: number;
}

/**
 * Pairs the committed `next` seed with the player's client seed and makes it
 * active, revealing the previous active pair if there was one.
 *
 * Open rounds bound to the revealed pair are forfeited as losses first:
 * revealing the seed would otherwise expose their outcome (mine positions, deck
 * order) mid-round, and refunding would let a player cancel a round they can
 * see going badly. A round currently claimed by another request makes the
 * whole rotation fail with RotationBusyError. The forfeit deletes the round
 * with a `claimedAt: null` guard before settling it, so a request that claims
 * the round concurrently either wins (and rotation aborts) or finds it gone.
 */
export async function rotateSeedPair(userId: string, clientSeed: string): Promise<RotationResult> {
  if (!CLIENT_SEED_PATTERN.test(clientSeed)) throw new Error("invalid client seed");

  // The next seed must have been committed by an earlier request. If this is
  // the first time we've seen the user, commit one now and make them come back.
  const hadNext = await prisma.$transaction((tx) => ensureNext(tx, userId));
  if (!hadNext) throw new SeedsNotReadyError();

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    let revealed: RotationResult["revealed"] = null;
    let forfeited = 0;

    const active = await tx.seedPair.findFirst({ where: { userId, status: "active" } });
    if (active) {
      // Lock the active row first: in-flight bets holding it finish before we
      // go on. The status guard turns a concurrent rotation that got there
      // first into a busy error here rather than a second reveal.
      const locked = await tx.seedPair.updateMany({
        where: { id: active.id, status: "active" },
        data: { status: "revealed", revealedAt: now },
      });
      if (locked.count !== 1) throw new RotationBusyError();
      // Re-read after the lock: bets that were holding it may have advanced the nonce.
      const r = await tx.seedPair.findUniqueOrThrow({ where: { id: active.id } });
      revealed = { id: r.id, serverSeed: r.serverSeed, serverSeedHash: r.serverSeedHash, clientSeed: r.clientSeed!, nonce: r.nonce };

      const rounds = (await tx.gameRound.findMany({ where: { userId } })).filter(
        (round) => (round.payload as ForfeitablePayload | null)?.seedPairId === active.id
      );
      for (const round of rounds) {
        const gone = await tx.gameRound.deleteMany({ where: { id: round.id, claimedAt: null } });
        if (gone.count !== 1) throw new RotationBusyError();
        const p = round.payload as ForfeitablePayload;
        await settleBet(
          {
            userId,
            game: round.game,
            betAmount: round.betAmount,
            profit: -round.betAmount,
            multiplier: 0,
            serverSeed: r.serverSeed,
            serverSeedHash: r.serverSeedHash,
            clientSeed: r.clientSeed!,
            nonce: p.nonce ?? 0,
            outcome: { forfeited: "seed rotation" } as Prisma.InputJsonValue,
            reserved: true,
            seedPairId: active.id,
          },
          tx
        );
      }
      forfeited = rounds.length;
    }

    const promoted = await tx.seedPair.updateMany({
      where: { userId, status: "next" },
      data: { status: "active", clientSeed, activatedAt: now },
    });
    if (promoted.count !== 1) throw new RotationBusyError();
    await tx.seedPair.create({ data: { userId, ...nextPairData() } });

    return { revealed, state: await readState(tx, userId), forfeited };
  });
}
