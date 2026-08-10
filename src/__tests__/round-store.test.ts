// Mocks src/lib/db's Prisma client with a minimal in-memory model of the
// GameRound table — just enough to exercise claimRound's guarded updateMany
// (the fix for the settlement race: two callers racing for the same token
// must not both win the claim) without a database. Mirrors the mock style
// in game-balance.test.ts.

interface FakeGameRound {
  id: string;
  userId: string;
  betAmount: bigint;
  payload: unknown;
  createdAt: Date;
  claimedAt: Date | null;
}

const rounds = new Map<string, FakeGameRound>();

function seedRound(round: FakeGameRound) {
  rounds.set(round.id, round);
}

const gameRoundModel = {
  findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
    const round = rounds.get(where.id);
    return round ? { ...round } : null;
  }),
  updateMany: jest.fn(async ({ where, data }: { where: { id: string; claimedAt: null }; data: { claimedAt: Date } }) => {
    const round = rounds.get(where.id);
    if (!round || round.claimedAt !== where.claimedAt) return { count: 0 };
    round.claimedAt = data.claimedAt;
    return { count: 1 };
  }),
  update: jest.fn(async ({ where, data }: { where: { id: string }; data: { payload: unknown; claimedAt: Date | null } }) => {
    const round = rounds.get(where.id);
    if (!round) throw new Error("round not found");
    round.payload = data.payload;
    round.claimedAt = data.claimedAt;
    return { ...round };
  }),
  delete: jest.fn(async ({ where }: { where: { id: string } }) => {
    const round = rounds.get(where.id);
    if (!round) throw new Error("round not found");
    rounds.delete(where.id);
    return { ...round };
  }),
};

interface FakePrismaClient {
  gameRound: typeof gameRoundModel;
  $transaction: (fn: (tx: FakePrismaClient) => Promise<unknown>) => Promise<unknown>;
}

const fakePrisma: FakePrismaClient = {
  gameRound: gameRoundModel,
  $transaction: jest.fn(async (fn: (tx: FakePrismaClient) => Promise<unknown>) => fn(fakePrisma)),
};

jest.mock("@/lib/db", () => ({ prisma: fakePrisma }));

import { claimRound, releaseRound, resolveRound } from "../lib/game-engine/round-store";

beforeEach(() => {
  rounds.clear();
  jest.clearAllMocks();
});

describe("claimRound", () => {
  test("returns the round's payload on a fresh, unclaimed round", async () => {
    seedRound({ id: "r1", userId: "u1", betAmount: 10_00n, payload: { foo: "bar" }, createdAt: new Date(), claimedAt: null });
    const claimed = await claimRound<{ foo: string }>("r1", "u1");
    expect(claimed).toMatchObject({ betAmount: 10_00n, payload: { foo: "bar" } });
  });

  test("a second concurrent claim on the same token returns null — this is the fix for the double-settle race", async () => {
    seedRound({ id: "r1", userId: "u1", betAmount: 10_00n, payload: {}, createdAt: new Date(), claimedAt: null });
    const [first, second] = await Promise.all([claimRound("r1", "u1"), claimRound("r1", "u1")]);
    const winners = [first, second].filter((r) => r !== null);
    expect(winners).toHaveLength(1);
  });

  test("returns null for a nonexistent token", async () => {
    expect(await claimRound("missing", "u1")).toBeNull();
  });

  test("returns null when the round belongs to a different user", async () => {
    seedRound({ id: "r1", userId: "owner", betAmount: 10_00n, payload: {}, createdAt: new Date(), claimedAt: null });
    expect(await claimRound("r1", "attacker")).toBeNull();
  });

  test("returns null for an already-claimed round even from the owning user", async () => {
    seedRound({ id: "r1", userId: "u1", betAmount: 10_00n, payload: {}, createdAt: new Date(), claimedAt: new Date() });
    expect(await claimRound("r1", "u1")).toBeNull();
  });
});

describe("releaseRound", () => {
  test("persists the new payload and clears the claim so the round can be claimed again", async () => {
    seedRound({ id: "r1", userId: "u1", betAmount: 10_00n, payload: { step: 1 }, createdAt: new Date(), claimedAt: new Date() });
    await releaseRound("r1", { step: 2 });
    const reclaimed = await claimRound<{ step: number }>("r1", "u1");
    expect(reclaimed?.payload).toEqual({ step: 2 });
  });
});

describe("resolveRound", () => {
  test("deletes the round", async () => {
    seedRound({ id: "r1", userId: "u1", betAmount: 10_00n, payload: {}, createdAt: new Date(), claimedAt: new Date() });
    await resolveRound("r1");
    expect(rounds.has("r1")).toBe(false);
  });

  test("is idempotent — resolving an already-deleted round does not throw", async () => {
    await expect(resolveRound("missing")).resolves.toBeUndefined();
  });
});
