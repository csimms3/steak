import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hiloGuess, type HiloState } from "@/lib/game-engine";
import { auth } from "@/auth";
import { settleBet } from "@/lib/game-balance";
import { claimRound, releaseRound, resolveRound } from "@/lib/game-engine/round-store";

type HiloRoundPayload = HiloState & { serverSeedHash: string };

const schema = z
  .object({
    state: z.string().optional(),
    token: z.string().optional(),
    guess: z.enum(["higher", "lower"]),
  })
  .refine((d) => !!d.state !== !!d.token, "exactly one of state or token is required");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.token) {
    const result = hiloGuess(parsed.data.state!, parsed.data.guess);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  // Authenticated: bridge the round's server-side payload through the same
  // encode/decode format hiloGuess() already speaks, so the pure engine
  // function stays untouched.
  const token = parsed.data.token;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const round = await claimRound<HiloRoundPayload>(token, session.user.id);
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  const encoded = Buffer.from(JSON.stringify(round.payload)).toString("base64");
  const result = hiloGuess(encoded, parsed.data.guess);
  if ("error" in result) {
    // Non-terminal error (e.g. deck exhausted) — release the claim so the
    // round stays playable (cashout) instead of being stuck claimed forever.
    await releaseRound(token, round.payload);
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  if (result.state) {
    // Correct guess — round continues, persist the new position/multiplier.
    const newPayload: HiloState = JSON.parse(Buffer.from(result.state, "base64").toString());
    await releaseRound(token, { ...newPayload, serverSeedHash: round.payload.serverSeedHash });
    return NextResponse.json({ ...result, state: undefined, token });
  }

  // Bust — terminal, settle the loss.
  const balance = Number(
    await settleBet({
      userId: session.user.id,
      game: "hilo",
      betAmount: round.betAmount,
      profit: BigInt(result.profit),
      multiplier: 0,
      serverSeed: result.serverSeed!,
      serverSeedHash: round.payload.serverSeedHash,
      clientSeed: round.payload.clientSeed,
      nonce: round.payload.nonce,
      outcome: {
        prevCard: { rank: result.prevCard.rank, suit: result.prevCard.suit },
        nextCard: { rank: result.nextCard.rank, suit: result.nextCard.suit },
      },
      reserved: true,
    })
  );
  await resolveRound(token);
  return NextResponse.json({ ...result, balance });
}
