import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMinesMultiplier } from "@/lib/game-engine";

const schema = z.object({
  state: z.string(),
  revealedCount: z.number().int().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { state, revealedCount } = parsed.data;

  let gameState: {
    serverSeed: string;
    clientSeed: string;
    mineCount: number;
    minePositions: number[];
    betAmount: number;
  };

  try {
    gameState = JSON.parse(Buffer.from(state, "base64").toString());
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const { serverSeed, clientSeed, mineCount, minePositions, betAmount } = gameState;
  const multiplier = getMinesMultiplier(mineCount, revealedCount);
  const profit = Math.floor(betAmount * (multiplier - 1));

  return NextResponse.json({
    profit,
    multiplier,
    minePositions,
    serverSeed,
    clientSeed,
  });
}
