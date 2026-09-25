import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { rotateSeedPair, RotationBusyError, CLIENT_SEED_PATTERN } from "@/lib/seed-pair";

const schema = z.object({
  clientSeed: z.string().regex(CLIENT_SEED_PATTERN, "1–64 letters, digits, _ . or -").optional(),
});

// Reveals the active server seed and starts a new pair with the chosen client
// seed. Open rounds are forfeited as losses (see rotateSeedPair).
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const { revealed, state, forfeited } = await rotateSeedPair(session.user.id, parsed.data.clientSeed);
    return NextResponse.json({
      revealed: {
        serverSeed: revealed.serverSeed,
        serverSeedHash: revealed.serverSeedHash,
        clientSeed: revealed.clientSeed,
        nonce: revealed.nonce,
      },
      active: {
        serverSeedHash: state.active.serverSeedHash,
        clientSeed: state.active.clientSeed,
        nonce: state.active.nonce,
      },
      nextServerSeedHash: state.nextServerSeedHash,
      forfeited,
    });
  } catch (err) {
    if (err instanceof RotationBusyError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
