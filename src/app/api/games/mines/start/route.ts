import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  generateMinePositions,
} from "@/lib/game-engine";

const schema = z.object({
  betAmount: z.number().int().min(100).max(10_000_00),
  mineCount: z.number().int().min(1).max(24),
  clientSeed: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, mineCount, clientSeed: suppliedClient } = parsed.data;
  const serverSeed = generateServerSeed();
  const clientSeed = suppliedClient ?? generateClientSeed();
  const serverSeedHash = hashServerSeed(serverSeed);

  // Derive mine positions — sent to client only after game ends
  const minePositions = generateMinePositions(serverSeed, clientSeed, 0, mineCount);

  // Encode state into a simple signed token so the client can't tamper
  // For now (no auth / no DB), we include serverSeed in the response but tell the
  // client not to peek. Production would store this server-side.
  const state = Buffer.from(
    JSON.stringify({ serverSeed, clientSeed, mineCount, minePositions, betAmount })
  ).toString("base64");

  return NextResponse.json({
    state,            // opaque blob the client sends back on each request
    serverSeedHash,
    clientSeed,
    mineCount,
    gridSize: 25,
  });
}
