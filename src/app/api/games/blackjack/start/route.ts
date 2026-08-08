import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { blackjackStart, type BlackjackState } from "@/lib/game-engine";
import { auth } from "@/auth";
import { reserveBet, settleBet, InsufficientBalanceError } from "@/lib/game-balance";
import { createRound, toJsonValue } from "@/lib/game-engine/round-store";

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
  const result = blackjackStart(betAmount, clientSeed);

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(result);

  let balance: number;
  try {
    balance = Number(await reserveBet(session.user.id, BigInt(betAmount)));
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }
    throw err;
  }

  // Natural (dealer or player blackjack) — terminal right away, no round to persist.
  if (result.stage === "done") {
    balance = Number(
      await settleBet({
        userId: session.user.id,
        game: "blackjack",
        betAmount: BigInt(betAmount),
        profit: BigInt(result.profit!),
        multiplier: 0,
        serverSeed: result.serverSeed!,
        serverSeedHash: result.serverSeedHash,
        clientSeed: result.clientSeed,
        nonce: 0,
        outcome: toJsonValue({ result: result.result, playerCards: result.playerCards, dealerCards: result.dealerCards }),
        reserved: true,
      })
    );
    return NextResponse.json({ ...result, balance });
  }

  const payload: BlackjackState = JSON.parse(Buffer.from(result.state!, "base64").toString());
  const token = await createRound(session.user.id, "blackjack", BigInt(betAmount), {
    ...payload,
    serverSeedHash: result.serverSeedHash,
    totalReserved: betAmount,
  });

  return NextResponse.json({
    playerCards: result.playerCards, dealerUpCard: result.dealerUpCard,
    token, serverSeedHash: result.serverSeedHash, clientSeed: result.clientSeed,
    canDouble: result.canDouble, canSplit: result.canSplit, stage: result.stage, balance,
  });
}
