import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page") ?? 0));

  const sessions = await prisma.gameSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE + 1,
    select: {
      id: true, game: true, betAmount: true, profit: true, multiplier: true,
      serverSeedHash: true, clientSeed: true, createdAt: true,
    },
  });

  const hasMore = sessions.length > PAGE_SIZE;
  const page_ = sessions.slice(0, PAGE_SIZE).map((s) => ({
    id: s.id,
    game: s.game,
    betAmount: Number(s.betAmount),
    profit: Number(s.profit),
    multiplier: s.multiplier,
    serverSeedHash: s.serverSeedHash,
    clientSeed: s.clientSeed,
    createdAt: s.createdAt.toISOString(),
  }));

  return NextResponse.json({ sessions: page_, hasMore });
}
