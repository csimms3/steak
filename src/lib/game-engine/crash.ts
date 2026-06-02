import { generateOutcome } from "./rng";

const HOUSE_EDGE = 0.01; // 1%

/**
 * Derives the crash point from a provably fair outcome.
 *
 * Formula (standard Stake-style):
 *   e = outcome (float in [0, 1))
 *   crashPoint = max(1.00, (1 - houseEdge) / (1 - e))
 *
 * The house edge means ~1% of rounds crash at exactly 1.00× ("instant crash").
 * When e < houseEdge, return 1.00 to model that.
 */
export function getCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const e = generateOutcome(serverSeed, clientSeed, nonce);

  if (e < HOUSE_EDGE) return 1.0;

  const raw = (1 - HOUSE_EDGE) / (1 - e);
  return Math.floor(raw * 100) / 100; // floor to 2 decimal places
}

export interface CrashBetResult {
  cashedOutAt: number | null; // null = busted
  profit: bigint;
}

export function resolveCrashBet(
  betAmount: bigint,
  cashedOutAt: number | null,
  crashPoint: number
): CrashBetResult {
  if (cashedOutAt === null || cashedOutAt > crashPoint) {
    return { cashedOutAt: null, profit: -betAmount };
  }
  const profit = BigInt(Math.floor(Number(betAmount) * (cashedOutAt - 1)));
  return { cashedOutAt, profit };
}
