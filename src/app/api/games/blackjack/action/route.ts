import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { blackjackAction, type BlackjackState } from "@/lib/game-engine";
import { auth } from "@/auth";
import { reserveBet, settleBet, InsufficientBalanceError } from "@/lib/game-balance";
import { claimRound, releaseRound, resolveRound, toJsonValue } from "@/lib/game-engine/round-store";

type BlackjackRoundPayload = BlackjackState & { serverSeedHash: string; totalReserved: number };

const schema = z
  .object({
    state: z.string().optional(),
    token: z.string().optional(),
    action: z.enum(["hit", "stand", "double", "split"]),
  })
  .refine((d) => !!d.state !== !!d.token, "exactly one of state or token is required");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.token) {
    const result = blackjackAction(parsed.data.state!, parsed.data.action);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  const token = parsed.data.token;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const round = await claimRound<BlackjackRoundPayload>(token, session.user.id);
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  // Double and split both add one more of the current hand's bet to total
  // exposure — reserve it up front so a bet can't outgrow the player's
  // balance mid-hand.
  let totalReserved = round.payload.totalReserved;
  if (parsed.data.action === "double" || parsed.data.action === "split") {
    const currentHand = round.payload.hands[round.payload.currentHandIndex];
    try {
      await reserveBet(session.user.id, BigInt(currentHand.bet));
      totalReserved += currentHand.bet;
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }
      throw err;
    }
  }

  const encoded = Buffer.from(JSON.stringify(round.payload)).toString("base64");
  const result = blackjackAction(encoded, parsed.data.action);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  if (result.stage === "player") {
    const newPayload: BlackjackState = JSON.parse(Buffer.from(result.state!, "base64").toString());
    await releaseRound(token, { ...newPayload, serverSeedHash: round.payload.serverSeedHash, totalReserved });
    return NextResponse.json({ ...result, state: undefined, token });
  }

  // Terminal — dealer played out, all hands settled.
  const balance = Number(
    await settleBet({
      userId: session.user.id,
      game: "blackjack",
      betAmount: BigInt(totalReserved),
      profit: BigInt(result.profit!),
      multiplier: 0,
      serverSeed: result.serverSeed!,
      serverSeedHash: round.payload.serverSeedHash,
      clientSeed: round.payload.clientSeed,
      nonce: round.payload.nonce,
      outcome: toJsonValue({ results: result.results, dealerCards: result.dealerCards }),
      reserved: true,
    })
  );
  await resolveRound(token);
  return NextResponse.json({ ...result, balance });
}
