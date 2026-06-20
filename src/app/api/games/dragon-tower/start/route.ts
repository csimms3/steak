import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dragonTowerStart } from "@/lib/game-engine";

const schema = z.object({
  betAmount: z.number().int().min(100).max(10_000_00),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  clientSeed: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, difficulty, clientSeed } = parsed.data;
  const result = dragonTowerStart(betAmount, difficulty, clientSeed);

  return NextResponse.json(result);
}
