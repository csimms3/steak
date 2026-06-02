import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMinesMultiplier, isMine } from "@/lib/game-engine";

const schema = z.object({
  state: z.string(),
  tileIndex: z.number().int().min(0).max(24),
  revealedCount: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { state, tileIndex, revealedCount } = parsed.data;

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

  const { minePositions, mineCount, betAmount } = gameState;
  const hit = isMine(tileIndex, minePositions);

  if (hit) {
    return NextResponse.json({
      hit: true,
      minePositions,
      profit: -betAmount,
      multiplier: 0,
    });
  }

  const newRevealedCount = revealedCount + 1;
  const multiplier = getMinesMultiplier(mineCount, newRevealedCount);

  return NextResponse.json({
    hit: false,
    multiplier,
    currentProfit: Math.floor(betAmount * (multiplier - 1)),
  });
}
