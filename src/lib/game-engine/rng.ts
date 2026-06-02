import { createHash, createHmac, randomBytes } from "crypto";

/**
 * Provably fair RNG using HMAC-SHA256.
 *
 * Protocol:
 *   1. Server generates serverSeed and publishes SHA256(serverSeed) before the round.
 *   2. Player supplies a clientSeed (or we generate one).
 *   3. Each bet uses nonce to prevent seed reuse across multiple outcomes.
 *   4. Outcome = HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`) → float in [0, 1).
 *   5. After the round, server reveals serverSeed so the player can verify.
 */

export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function generateClientSeed(): string {
  return randomBytes(8).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed).digest("hex");
}

/**
 * Derives a float in [0, 1) from the three inputs.
 * Uses the first 8 hex chars (32 bits) of the HMAC output for precision.
 */
export function generateOutcome(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const hmac = createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest("hex");

  // Use first 8 hex chars → 32-bit unsigned int → divide by 2^32
  const intValue = parseInt(hmac.slice(0, 8), 16);
  return intValue / 0x100000000;
}

export function verifyBet(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  expectedOutcome: number
): boolean {
  const actual = generateOutcome(serverSeed, clientSeed, nonce);
  return Math.abs(actual - expectedOutcome) < Number.EPSILON;
}
