import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  resolveKeno,
} from "@/lib/game-engine";
import { auth } from "@/auth";
import { settleBet, InsufficientBalanceError } from "@/lib/game-balance";

const schema = z.object({
  betAmount: z.number().int().min(100).max(10_000_00),
  picks: z.array(z.number().int().min(1).max(40)).min(1).max(10),
  clientSeed: z.string().optional(),
  nonce: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, picks, clientSeed: suppliedClient, nonce = 0 } = parsed.data;
  const serverSeed = generateServerSeed();
  const clientSeed = suppliedClient ?? generateClientSeed();
  const serverSeedHash = hashServerSeed(serverSeed);

  const result = resolveKeno(serverSeed, clientSeed, nonce, BigInt(betAmount), picks);

  const session = await auth();
  let balance: number | undefined;
  if (session?.user?.id) {
    try {
      balance = Number(
        await settleBet({
          userId: session.user.id,
          game: "keno",
          betAmount: BigInt(betAmount),
          profit: result.profit,
          multiplier: result.multiplier,
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          outcome: { picks: result.picks, drawn: result.drawn, hits: result.hits },
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
    picks: result.picks,
    drawn: result.drawn,
    hits: result.hits,
    multiplier: result.multiplier,
    profit: Number(result.profit),
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce,
    ...(balance !== undefined ? { balance } : {}),
  });
}
