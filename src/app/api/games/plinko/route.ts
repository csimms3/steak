import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  resolvePlinko,
  type PlinkoRisk,
} from "@/lib/game-engine";

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

  return NextResponse.json(count === 1 ? results[0] : results);
}
