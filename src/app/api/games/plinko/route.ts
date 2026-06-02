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
  clientSeed: z.string().optional(),
  nonce: z.number().int().min(0).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, rows, risk, clientSeed: suppliedClient, nonce = 0 } = parsed.data;

  const serverSeed = generateServerSeed();
  const clientSeed = suppliedClient ?? generateClientSeed();
  const serverSeedHash = hashServerSeed(serverSeed);

  const result = resolvePlinko(
    serverSeed,
    clientSeed,
    nonce,
    BigInt(betAmount),
    rows,
    risk as PlinkoRisk
  );

  return NextResponse.json({
    path: result.path,
    bucketIndex: result.bucketIndex,
    multiplier: result.multiplier,
    profit: Number(result.profit),
    serverSeed,
    serverSeedHash,
    clientSeed,
    nonce,
  });
}
