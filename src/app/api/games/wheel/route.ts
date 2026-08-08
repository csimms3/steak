import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  resolveWheel,
  getWheelRing,
  type WheelSegments,
  type WheelRisk,
} from "@/lib/game-engine";
import { auth } from "@/auth";
import { settleBet, InsufficientBalanceError } from "@/lib/game-balance";

const schema = z.object({
  betAmount: z.number().int().min(100).max(10_000_00),
  segments: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(40), z.literal(50)]),
  risk: z.enum(["low", "medium", "high"]),
  clientSeed: z.string().optional(),
  nonce: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, segments, risk, clientSeed: suppliedClient, nonce = 0 } = parsed.data;
  const serverSeed = generateServerSeed();
  const clientSeed = suppliedClient ?? generateClientSeed();
  const serverSeedHash = hashServerSeed(serverSeed);

  const result = resolveWheel(
    serverSeed, clientSeed, nonce, BigInt(betAmount),
    segments as WheelSegments, risk as WheelRisk
  );

  const session = await auth();
  let balance: number | undefined;
  if (session?.user?.id) {
    try {
      balance = Number(
        await settleBet({
          userId: session.user.id,
          game: "wheel",
          betAmount: BigInt(betAmount),
          profit: result.profit,
          multiplier: result.multiplier,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          outcome: { segmentIndex: result.segmentIndex, segments, risk },
          reserved: false,
        })
      );
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
      }
      throw err;
    }
  }

  return NextResponse.json({
    segmentIndex: result.segmentIndex,
    multiplier: result.multiplier,
    profit: Number(result.profit),
    ring: getWheelRing(segments as WheelSegments, risk as WheelRisk),
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce,
    ...(balance !== undefined ? { balance } : {}),
  });
}
