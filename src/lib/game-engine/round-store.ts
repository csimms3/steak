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

export async function loadRound<T>(
  token: string,
  userId: string
): Promise<{ betAmount: bigint; payload: T; createdAt: Date } | null> {
  const round = await prisma.gameRound.findUnique({ where: { id: token } });
  if (!round || round.userId !== userId) return null;
  return { betAmount: round.betAmount, payload: round.payload as T, createdAt: round.createdAt };
}

/** For games whose secret state evolves each step (e.g. Hilo's position/multiplier). */
export async function updateRound(token: string, payload: unknown): Promise<void> {
  await prisma.gameRound.update({ where: { id: token }, data: { payload: toJsonValue(payload) } });
}

export async function resolveRound(token: string): Promise<void> {
  await prisma.gameRound.delete({ where: { id: token } }).catch(() => {
    // Already resolved/deleted — terminal routes are idempotent by design.
  });
}
