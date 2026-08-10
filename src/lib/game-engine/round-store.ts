import { Prisma, GameType } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Server-side storage for a stateful game's secret in-progress data (mine
 * positions, dragon positions, dealt cards, deck order). Authenticated play
 * uses this instead of the client-visible base64 blob used by guest play —
 * the blob is unsigned and ships secrets in the clear (e.g. Mines'
 * minePositions are readable via base64-decode before a tile is revealed).
 * Guest play keeps the blob mechanism: no DB row to key against without an
 * account, and no real balance is at stake there.
 */

/**
 * Prisma's InputJsonValue requires plain index-signature-compatible objects —
 * nominal interfaces like Card or BlackjackHand don't structurally qualify
 * even though they're plain data at runtime. A JSON round-trip erases the
 * nominal type safely for these DTOs (no Dates/Maps/methods involved).
 */
export function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

export async function createRound(
  userId: string,
  game: GameType,
  betAmount: bigint,
  payload: unknown
): Promise<string> {
  const round = await prisma.gameRound.create({
    data: { userId, game, betAmount, payload: toJsonValue(payload) },
    select: { id: true },
  });
  return round.id;
}

/**
 * Atomically claims a round for exclusive processing: the request that wins
 * the race to flip claimedAt from null to now proceeds; a concurrent request
 * for the same token gets null back and must not act on the round. Without
 * this, two concurrent requests carrying the same token could both read the
 * round before either mutates it — e.g. both settle a cashout, double-paying
 * the same bet. Pair every claim with releaseRound (round continues) or
 * resolveRound (round is terminal).
 */
export async function claimRound<T>(
  token: string,
  userId: string
): Promise<{ betAmount: bigint; payload: T; createdAt: Date } | null> {
  return prisma.$transaction(async (tx) => {
    const round = await tx.gameRound.findUnique({ where: { id: token } });
    if (!round || round.userId !== userId) return null;

    const claim = await tx.gameRound.updateMany({
      where: { id: token, claimedAt: null },
      data: { claimedAt: new Date() },
    });
    if (claim.count === 0) return null;

    return { betAmount: round.betAmount, payload: round.payload as T, createdAt: round.createdAt };
  });
}

/** Saves a claimed round's evolved payload and releases the claim so the next request can act on it. */
export async function releaseRound(token: string, payload: unknown): Promise<void> {
  await prisma.gameRound.update({
    where: { id: token },
    data: { payload: toJsonValue(payload), claimedAt: null },
  });
}

export async function resolveRound(token: string): Promise<void> {
  await prisma.gameRound.delete({ where: { id: token } }).catch(() => {
    // Already resolved/deleted — terminal routes are idempotent by design.
  });
}
