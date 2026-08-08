import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const DEFAULT_STARTING_BALANCE = 100000; // $1000.00 in minor units, matches the schema default

const schema = z.object({
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscore only"),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  startingBalance: z.number().int().min(1).max(100_000_00).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { username, email, password, startingBalance } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        balance: BigInt(startingBalance ?? DEFAULT_STARTING_BALANCE),
      },
      select: { id: true, username: true },
    });
    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const field = (err.meta?.target as string[] | undefined)?.[0] ?? "username or email";
      return NextResponse.json({ error: `That ${field} is already taken.` }, { status: 409 });
    }
    throw err;
  }
}
