import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  resolveFlip,
  type Side,
} from "@/lib/game-engine";
import { auth } from "@/auth";
import { settleBet, InsufficientBalanceError } from "@/lib/game-balance";

const schema = z.object({
  betAmount: z.number().int().min(100).max(10_000_00),
  side: z.enum(["heads", "tails"]),
  targetStreak: z.number().int().min(1).max(10),
  clientSeed: z.string().optional(),
  nonce: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, side, targetStreak, clientSeed: suppliedClient, nonce = 0 } = parsed.data;
  const serverSeed = generateServerSeed();
  const clientSeed = suppliedClient ?? generateClientSeed();
  const serverSeedHash = hashServerSeed(serverSeed);

  const result = resolveFlip(serverSeed, clientSeed, nonce, BigInt(betAmount), side as Side, targetStreak);

  const session = await auth();
  let balance: number | undefined;
  if (session?.user?.id) {
    try {
      balance = Number(
        await settleBet({
          userId: session.user.id,
          game: "flip",
          betAmount: BigInt(betAmount),
          profit: result.profit,
          multiplier: result.multiplier,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          outcome: { flips: result.flips, side: result.side, streak: result.streak, targetStreak, win: result.win },
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
    flips: result.flips,
    side: result.side,
    streak: result.streak,
    targetStreak: result.targetStreak,
    win: result.win,
    multiplier: result.multiplier,
    profit: Number(result.profit),
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce,
    ...(balance !== undefined ? { balance } : {}),
  });
}
