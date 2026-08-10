import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dragonTowerClimb, type DragonTowerState } from "@/lib/game-engine";
import { auth } from "@/auth";
import { settleBet } from "@/lib/game-balance";
import { claimRound, releaseRound, resolveRound } from "@/lib/game-engine/round-store";

type DragonTowerRoundPayload = DragonTowerState & { serverSeedHash: string };

const schema = z
  .object({
    state: z.string().optional(),
    token: z.string().optional(),
    col: z.number().int().min(0).max(3),
  })
  .refine((d) => !!d.state !== !!d.token, "exactly one of state or token is required");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.token) {
    const result = dragonTowerClimb(parsed.data.state!, parsed.data.col);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result);
  }

  const token = parsed.data.token;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const round = await claimRound<DragonTowerRoundPayload>(token, session.user.id);
  if (!round) return NextResponse.json({ error: "Round not found" }, { status: 404 });

  const encoded = Buffer.from(JSON.stringify(round.payload)).toString("base64");
  const result = dragonTowerClimb(encoded, parsed.data.col);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  // Still climbing — safe, tower not fully cleared.
  if (!result.cleared && result.safe) {
    const newPayload: DragonTowerState = JSON.parse(Buffer.from(result.state!, "base64").toString());
    await releaseRound(token, { ...newPayload, serverSeedHash: round.payload.serverSeedHash });
    return NextResponse.json({ ...result, state: undefined, token });
  }

  // Terminal — either hit a dragon (loss) or cleared all 9 rows (win).
  const balance = Number(
    await settleBet({
      userId: session.user.id,
      game: "dragon_tower",
      betAmount: round.betAmount,
      profit: BigInt(result.profit),
      multiplier: result.multiplier,
      serverSeed: result.serverSeed!,
      serverSeedHash: round.payload.serverSeedHash,
      clientSeed: round.payload.clientSeed,
      nonce: round.payload.nonce,
      outcome: { dragonCols: result.dragonCols, pickedCol: result.pickedCol, cleared: result.cleared },
      reserved: true,
    })
  );
  await resolveRound(token);
  return NextResponse.json({ ...result, balance });
}
