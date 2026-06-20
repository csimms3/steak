import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dragonTowerCashout } from "@/lib/game-engine";

const schema = z.object({ state: z.string() });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = dragonTowerCashout(parsed.data.state);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
