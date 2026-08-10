import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMinesMultiplier } from "@/lib/game-engine";
import { auth } from "@/auth";
import { settleBet } from "@/lib/game-balance";
import { claimRound, resolveRound } from "@/lib/game-engine/round-store";

const schema = z
  .object({
    state: z.string().optional(),
    token: z.string().optional(),
    revealedCount: z.number().int().min(1),
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

  const { revealedCount } = parsed.data;

  let gameState: MinesPayload;
  let token: string | undefined;

  if (parsed.data.token) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const round = await claimRound<MinesPayload>(parsed.data.token, session.user.id);
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

  const { serverSeed, serverSeedHash, clientSeed, mineCount, minePositions, betAmount } = gameState;
  const multiplier = getMinesMultiplier(mineCount, revealedCount);
  const profit = Math.floor(betAmount * (multiplier - 1));

  let balance: number | undefined;
  if (token) {
    const session = await auth();
    balance = Number(
      await settleBet({
        userId: session!.user.id,
        game: "mines",
        betAmount: BigInt(betAmount),
        profit: BigInt(profit),
        multiplier,
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce: 0,
        outcome: { minePositions, mineCount, revealedCount },
        reserved: true,
      })
    );
    await resolveRound(token);
  }

  return NextResponse.json({
    profit,
    multiplier,
    minePositions,
    serverSeed,
    clientSeed,
    ...(balance !== undefined ? { balance } : {}),
  });
}
