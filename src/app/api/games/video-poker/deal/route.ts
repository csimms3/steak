import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { videoPokerDeal } from "@/lib/game-engine";

const schema = z.object({
  betAmount: z.number().int().min(100).max(10_000_00),
  clientSeed: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { betAmount, clientSeed } = parsed.data;
  const result = videoPokerDeal(betAmount, clientSeed);

  return NextResponse.json(result);
}
