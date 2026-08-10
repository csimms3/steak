import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { videoPokerDraw, type VideoPokerState } from "@/lib/game-engine";
import { auth } from "@/auth";
import { settleBet } from "@/lib/game-balance";
import { claimRound, resolveRound, toJsonValue } from "@/lib/game-engine/round-store";

type VideoPokerRoundPayload = VideoPokerState & { serverSeedHash: string };

const schema = z
  .object({
    state: z.string().optional(),
    token: z.string().optional(),
    holds: z.array(z.boolean()).length(5),
  })
  .refine((d) => !!d.state !== !!d.token, "exactly one of state or token is required");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.token) {
    const result = videoPokerDraw(parsed.data.state!, parsed.data.holds);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  const token = parsed.data.token;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const round = await claimRound<VideoPokerRoundPayload>(token, session.user.id);
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  const encoded = Buffer.from(JSON.stringify(round.payload)).toString("base64");
  const result = videoPokerDraw(encoded, parsed.data.holds);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const balance = Number(
    await settleBet({
      userId: session.user.id,
      game: "video_poker",
      betAmount: round.betAmount,
      profit: BigInt(result.profit),
      multiplier: result.multiplier,
      serverSeed: result.serverSeed,
      serverSeedHash: round.payload.serverSeedHash,
      clientSeed: round.payload.clientSeed,
      nonce: round.payload.nonce,
      outcome: toJsonValue({ finalHand: result.finalHand, category: result.category, holds: parsed.data.holds }),
      reserved: true,
    })
  );
  await resolveRound(token);

  return NextResponse.json({ ...result, balance });
}
