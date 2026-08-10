import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  generateMinePositions,
} from "@/lib/game-engine";
import { auth } from "@/auth";
import { reserveBet, InsufficientBalanceError } from "@/lib/game-balance";
import { createRound } from "@/lib/game-engine/round-store";

const schema = z.object({
  betAmount: z.number().int().min(100).max(10_000_00),
  mineCount: z.number().int().min(1).max(24),
  clientSeed: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, mineCount, clientSeed: suppliedClient } = parsed.data;
  const serverSeed = generateServerSeed();
  const clientSeed = suppliedClient ?? generateClientSeed();
  const serverSeedHash = hashServerSeed(serverSeed);

  // Derive mine positions — kept secret until the game ends.
  const minePositions = generateMinePositions(serverSeed, clientSeed, 0, mineCount);

  const session = await auth();
  if (session?.user?.id) {
    let balance: number;
    try {
      balance = Number(await reserveBet(session.user.id, BigInt(betAmount)));
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }
      throw err;
    }
    const token = await createRound(session.user.id, "mines", BigInt(betAmount), {
      serverSeed, serverSeedHash, clientSeed, mineCount, minePositions, betAmount, revealedTiles: [],
    });
    return NextResponse.json({ token, serverSeedHash, clientSeed, mineCount, gridSize: 25, balance });
  }

  // Guest: opaque client-visible blob (documented limitation — see round-store.ts).
  const state = Buffer.from(
    JSON.stringify({ serverSeed, clientSeed, mineCount, minePositions, betAmount })
  ).toString("base64");

  return NextResponse.json({ state, serverSeedHash, clientSeed, mineCount, gridSize: 25 });
}
