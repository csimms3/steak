import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  getCrashPoint,
  resolveCrashBet,
} from "@/lib/game-engine";

const startSchema = z.object({ action: z.literal("start"), betAmount: z.number().int().min(100) });
const cashoutSchema = z.object({
  action: z.literal("cashout"),
  state: z.string(),
  cashedOutAt: z.number().min(1.01),
});
const schema = z.discriminatedUnion("action", [startSchema, cashoutSchema]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "start") {
    const { betAmount } = parsed.data;
    const serverSeed = generateServerSeed();
    const clientSeed = generateClientSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const crashPoint = getCrashPoint(serverSeed, clientSeed, 0);

    const state = Buffer.from(
      JSON.stringify({ serverSeed, clientSeed, betAmount, crashPoint })
    ).toString("base64");

    // We return crashPoint to the client so the animation can run to the correct value.
    // In a real multiplayer implementation this would be kept server-side until the round ends.
    return NextResponse.json({ state, serverSeedHash, clientSeed, crashPoint });
  }

  // cashout
  const { state, cashedOutAt } = parsed.data;
  let gameState: { serverSeed: string; clientSeed: string; betAmount: number; crashPoint: number };
  try {
    gameState = JSON.parse(Buffer.from(state, "base64").toString());
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const { serverSeed, clientSeed, betAmount, crashPoint } = gameState;
  const result = resolveCrashBet(BigInt(betAmount), cashedOutAt, crashPoint);

  return NextResponse.json({
    crashPoint,
    cashedOutAt: result.cashedOutAt,
    profit: Number(result.profit),
    win: result.cashedOutAt !== null,
    serverSeed,
    clientSeed,
  });
}
