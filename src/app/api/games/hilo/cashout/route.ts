import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hiloCashout, type HiloState } from "@/lib/game-engine";
import { auth } from "@/auth";
import { settleBet } from "@/lib/game-balance";
import { claimRound, releaseRound, resolveRound } from "@/lib/game-engine/round-store";

type HiloRoundPayload = HiloState & { serverSeedHash: string };

const schema = z
  .object({ state: z.string().optional(), token: z.string().optional() })
  .refine((d) => !!d.state !== !!d.token, "exactly one of state or token is required");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.token) {
    const result = hiloCashout(parsed.data.state!);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  const token = parsed.data.token;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const round = await claimRound<HiloRoundPayload>(token, session.user.id);
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  const encoded = Buffer.from(JSON.stringify(round.payload)).toString("base64");
  const result = hiloCashout(encoded);
  if ("error" in result) {
    // Non-terminal error (e.g. nothing to cashout yet) — release the claim so
    // the round stays playable instead of being stuck claimed forever.
    await releaseRound(token, round.payload);
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const balance = Number(
    await settleBet({
      userId: session.user.id,
      game: "hilo",
      betAmount: round.betAmount,
      profit: BigInt(result.profit),
      multiplier: result.multiplier,
      serverSeed: result.serverSeed,
      serverSeedHash: round.payload.serverSeedHash,
      clientSeed: round.payload.clientSeed,
      nonce: round.payload.nonce,
      outcome: { position: round.payload.position, multiplier: result.multiplier },
      reserved: true,
    })
  );
  await resolveRound(token);

  return NextResponse.json({ ...result, balance });
}
