import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { videoPokerDraw } from "@/lib/game-engine";

const schema = z.object({
  state: z.string(),
  holds: z.array(z.boolean()).length(5),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = videoPokerDraw(parsed.data.state, parsed.data.holds);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
