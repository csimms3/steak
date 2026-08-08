import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  resolvePlinko,
  type PlinkoRisk,
} from "@/lib/game-engine";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { InsufficientBalanceError } from "@/lib/game-balance";

const schema = z.object({
  betAmount: z.number().int().min(100).max(10_000_00),
  rows: z.union([z.literal(8), z.literal(12), z.literal(16)]),
  risk: z.enum(["low", "medium", "high"]),
  count: z.number().int().min(1).max(100).default(1),
  clientSeed: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, rows, risk, count, clientSeed: suppliedClient } = parsed.data;

  const results = Array.from({ length: count }, (_, i) => {
    const serverSeed = generateServerSeed();
    const clientSeed = suppliedClient ?? generateClientSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const result = resolvePlinko(serverSeed, clientSeed, i, BigInt(betAmount), rows, risk as PlinkoRisk);

    return {
      path: result.path,
      bucketIndex: result.bucketIndex,
      multiplier: result.multiplier,
      profit: Number(result.profit),
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce: i,
    };
  });

  const session = await auth();
  let balance: number | undefined;
  if (session?.user?.id) {
    const userId = session.user.id;
    const totalBet = BigInt(betAmount) * BigInt(count);
    const totalProfit = results.reduce((sum, r) => sum + BigInt(r.profit), 0n);

    try {
      balance = Number(
        await prisma.$transaction(async (tx) => {
          const guard = await tx.user.updateMany({
            where: { id: userId, balance: { gte: totalBet } },
            data: { balance: { increment: totalProfit } },
          });
          if (guard.count === 0) throw new InsufficientBalanceError();

          await tx.gameSession.createMany({
            data: results.map((r) => ({
              userId,
              game: "plinko" as const,
              betAmount: BigInt(betAmount),
              profit: BigInt(r.profit),
              multiplier: r.multiplier,
              serverSeed: r.serverSeed,
              serverSeedHash: r.serverSeedHash,
              clientSeed: r.clientSeed,
              nonce: r.nonce,
              outcome: { bucketIndex: r.bucketIndex, rows, risk },
            })),
          });

          const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } });
          return user.balance;
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
    results,
    ...(balance !== undefined ? { balance } : {}),
  });
}
