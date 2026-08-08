import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { videoPokerDeal, type VideoPokerState } from "@/lib/game-engine";
import { auth } from "@/auth";
import { reserveBet, InsufficientBalanceError } from "@/lib/game-balance";
import { createRound } from "@/lib/game-engine/round-store";

const schema = z.object({
  betAmount: z.number().int().min(100).max(10_000_00),
  clientSeed: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, clientSeed } = parsed.data;
  const result = videoPokerDeal(betAmount, clientSeed);

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
    const payload: VideoPokerState = JSON.parse(Buffer.from(result.state, "base64").toString());
    const token = await createRound(session.user.id, "video_poker", BigInt(betAmount), {
      ...payload,
      serverSeedHash: result.serverSeedHash,
    });
    return NextResponse.json({ hand: result.hand, token, serverSeedHash: result.serverSeedHash, clientSeed: result.clientSeed, balance });
  }

  return NextResponse.json(result);
}
