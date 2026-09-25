// Mocks src/lib/db's Prisma client with a minimal in-memory model of the
// SeedPair, GameRound, User and GameSession tables: just the query shapes
// seed-pair.ts and settleBet use. Mirrors the mock style in
// game-balance.test.ts. Row locking isn't modelled; concurrency is covered by
// the e2e run against real Postgres.
import { createHash } from "crypto";

interface FakePair {
  id: string;
  userId: string;
  status: "next" | "active" | "revealed";
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string | null;
  nonce: number;
  activatedAt: Date | null;
  revealedAt: Date | null;
}
interface FakeRound { id: string; userId: string; game: string; betAmount: bigint; payload: unknown; claimedAt: Date | null }

let pairs: FakePair[] = [];
let rounds: FakeRound[] = [];
const sessions: Record<string, unknown>[] = [];
const balances = new Map<string, bigint>();
let seq = 0;

type Where = Record<string, unknown>;
function matches(row: object, where: Where): boolean {
  return Object.entries(where).every(([k, v]) => {
    const actual = (row as Record<string, unknown>)[k];
    if (v && typeof v === "object" && "in" in (v as object)) return (v as { in: unknown[] }).in.includes(actual);
    return actual === v;
  });
}

function insertPair(data: Partial<FakePair> & { userId: string; status: FakePair["status"] }): boolean {
  if (data.status !== "revealed" && pairs.some((p) => p.userId === data.userId && p.status === data.status)) return false;
  pairs.push({ id: `pair${++seq}`, serverSeed: "", serverSeedHash: "", clientSeed: null, nonce: 0, activatedAt: null, revealedAt: null, ...data });
  return true;
}

function applyData(row: FakePair, data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && "increment" in (v as object)) {
      (row as unknown as Record<string, number>)[k] += (v as { increment: number }).increment;
    } else {
      (row as unknown as Record<string, unknown>)[k] = v;
    }
  }
}

const fakePrisma = {
  seedPair: {
    findMany: jest.fn(async ({ where, take }: { where: Where; take?: number }) =>
      pairs.filter((p) => matches(p, where)).slice(0, take ?? Infinity).map((p) => ({ ...p }))),
    findFirstOrThrow: jest.fn(async ({ where }: { where: Where }) => {
      const p = pairs.find((row) => matches(row, where));
      if (!p) throw new Error("not found");
      return { ...p };
    }),
    findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => {
      const p = pairs.find((row) => row.id === where.id);
      if (!p) throw new Error("not found");
      return { ...p };
    }),
    updateMany: jest.fn(async ({ where, data }: { where: Where; data: Record<string, unknown> }) => {
      const hit = pairs.filter((p) => matches(p, where));
      hit.forEach((p) => applyData(p, data));
      return { count: hit.length };
    }),
    createMany: jest.fn(async ({ data }: { data: (Partial<FakePair> & { userId: string; status: FakePair["status"] })[] }) => ({
      count: data.filter((d) => insertPair(d)).length,
    })),
    create: jest.fn(async ({ data }: { data: Partial<FakePair> & { userId: string; status: FakePair["status"] } }) => {
      if (!insertPair(data)) throw new Error("unique violation");
      return { ...pairs[pairs.length - 1] };
    }),
  },
  gameRound: {
    findMany: jest.fn(async ({ where }: { where: Where }) => rounds.filter((r) => matches(r, where)).map((r) => ({ ...r }))),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      rounds = rounds.filter((r) => r.id !== where.id);
    }),
  },
  user: {
    update: jest.fn(async ({ where, data }: { where: { id: string }; data: { balance: { increment: bigint } } }) => {
      const balance = (balances.get(where.id) ?? 0n) + data.balance.increment;
      balances.set(where.id, balance);
      return { id: where.id, balance };
    }),
  },
  gameSession: {
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
      sessions.push(data);
      return data;
    }),
  },
  $transaction: jest.fn(runTx),
};

// A function declaration with an explicit return type breaks the
// fakePrisma ↔ $transaction inference cycle.
function runTx(fn: (tx: unknown) => Promise<unknown>): Promise<unknown> {
  return fn(fakePrisma);
}

jest.mock("@/lib/db", () => ({ prisma: fakePrisma }));

import {
  getSeedState,
  allocateNonces,
  rotateSeedPair,
  RotationBusyError,
} from "@/lib/seed-pair";
import type { Tx } from "@/lib/game-balance";

const tx = fakePrisma as unknown as Tx;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

beforeEach(() => {
  pairs = [];
  rounds = [];
  sessions.length = 0;
  balances.clear();
  balances.set("u1", 99_000n);
});

describe("getSeedState", () => {
  test("lazily creates an active pair and a committed next pair, exposing hashes only", async () => {
    const state = await getSeedState("u1");
    expect(pairs.map((p) => p.status).sort()).toEqual(["active", "next"]);
    const active = pairs.find((p) => p.status === "active")!;
    const next = pairs.find((p) => p.status === "next")!;
    expect(state.active.serverSeedHash).toBe(sha256(active.serverSeed));
    expect(state.nextServerSeedHash).toBe(sha256(next.serverSeed));
    expect(next.clientSeed).toBeNull(); // chosen later, at rotation
    expect(JSON.stringify(state)).not.toContain(active.serverSeed);
  });

  test("is idempotent", async () => {
    const a = await getSeedState("u1");
    const b = await getSeedState("u1");
    expect(b).toEqual(a);
    expect(pairs).toHaveLength(2);
  });
});

describe("allocateNonces", () => {
  test("hands out consecutive nonces from the active pair", async () => {
    const first = await allocateNonces(tx, "u1");
    const second = await allocateNonces(tx, "u1");
    const multi = await allocateNonces(tx, "u1", 3);
    expect([first.firstNonce, second.firstNonce, multi.firstNonce]).toEqual([0, 1, 2]);
    expect((await allocateNonces(tx, "u1")).firstNonce).toBe(5);
    expect(first.seedPairId).toBe(pairs.find((p) => p.status === "active")!.id);
    expect(first.serverSeedHash).toBe(sha256(first.serverSeed));
  });
});

describe("rotateSeedPair", () => {
  test("reveals the active seed and promotes the pre-committed next seed", async () => {
    const before = await getSeedState("u1");
    await allocateNonces(tx, "u1", 4);

    const { revealed, state } = await rotateSeedPair("u1", "my-own-seed");

    expect(sha256(revealed.serverSeed)).toBe(before.active.serverSeedHash);
    expect(revealed.nonce).toBe(4);
    // The new active seed is the one whose hash was published before the client seed was chosen.
    expect(state.active.serverSeedHash).toBe(before.nextServerSeedHash);
    expect(state.active.clientSeed).toBe("my-own-seed");
    expect(state.active.nonce).toBe(0);
    expect(state.nextServerSeedHash).not.toBe(before.nextServerSeedHash);
    expect(pairs.filter((p) => p.status === "revealed")).toHaveLength(1);
  });

  test("picks a random client seed when none is given", async () => {
    const { state } = await rotateSeedPair("u1");
    expect(state.active.clientSeed).toMatch(/^[0-9a-f]{16}$/);
  });

  test("rejects client seeds outside the allowed charset", async () => {
    await expect(rotateSeedPair("u1", "has:colon")).rejects.toThrow("invalid client seed");
    await expect(rotateSeedPair("u1", "x".repeat(65))).rejects.toThrow("invalid client seed");
  });

  test("forfeits open rounds as losses before revealing", async () => {
    rounds.push({
      id: "r1", userId: "u1", game: "mines", betAmount: 1000n, claimedAt: null,
      payload: { serverSeed: "s", serverSeedHash: "h", clientSeed: "c", nonce: 7, seedPairId: "pairX" },
    });

    const { forfeited } = await rotateSeedPair("u1");

    expect(forfeited).toBe(1);
    expect(rounds).toHaveLength(0);
    expect(balances.get("u1")).toBe(99_000n); // reserved at start; a loss credits nothing back
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ game: "mines", profit: -1000n, nonce: 7, seedPairId: "pairX", outcome: { forfeited: "seed rotation" } });
  });

  test("forfeits rounds whose claim is stale", async () => {
    rounds.push({ id: "r1", userId: "u1", game: "hilo", betAmount: 500n, payload: {}, claimedAt: new Date(Date.now() - 60_000) });
    await expect(rotateSeedPair("u1")).resolves.toMatchObject({ forfeited: 1 });
  });

  test("refuses while a round is claimed by an in-flight request", async () => {
    rounds.push({ id: "r1", userId: "u1", game: "mines", betAmount: 1000n, payload: {}, claimedAt: new Date() });
    await expect(rotateSeedPair("u1")).rejects.toBeInstanceOf(RotationBusyError);
  });
});
