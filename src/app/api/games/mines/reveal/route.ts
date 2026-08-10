import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMinesMultiplier, isMine } from "@/lib/game-engine";
import { auth } from "@/auth";
import { settleBet } from "@/lib/game-balance";
import { loadRound, resolveRound } from "@/lib/game-engine/round-store";

const schema = z
  .object({
    state: z.string().optional(),
    token: z.string().optional(),
    tileIndex: z.number().int().min(0).max(24),
    revealedCount: z.number().int().min(0),
  })
  .refine((d) => !!d.state !== !!d.token, "exactly one of state or token is required");

interface MinesPayload {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  mineCount: number;
  minePositions: number[];
  betAmount: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tileIndex, revealedCount } = parsed.data;

  let gameState: MinesPayload;
  let token: string | undefined;

  if (parsed.data.token) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const round = await loadRound<MinesPayload>(parsed.data.token, session.user.id);
    if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });
    gameState = round.payload;
    token = parsed.data.token;
  } else {
    try {
      gameState = JSON.parse(Buffer.from(parsed.data.state!, "base64").toString());
    } catch {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }
  }

  const { serverSeed, serverSeedHash, clientSeed, minePositions, mineCount, betAmount } = gameState;
  const hit = isMine(tileIndex, minePositions);

  if (hit) {
    let balance: number | undefined;
    if (token) {
      const session = await auth();
      balance = Number(
        await settleBet({
          userId: session!.user.id,
          game: "mines",
          betAmount: BigInt(betAmount),
          profit: BigInt(-betAmount),
          multiplier: 0,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce: 0,
          outcome: { minePositions, mineCount, tileIndex, revealedCount },
          reserved: true,
        })
      );
      await resolveRound(token);
    }

    return NextResponse.json({
      hit: true,
      minePositions,
      profit: -betAmount,
      multiplier: 0,
      ...(balance !== undefined ? { balance } : {}),
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
