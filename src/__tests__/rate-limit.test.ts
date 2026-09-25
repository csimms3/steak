import { createRateLimiter, clientIp } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  let t = 0;
  const now = () => t;
  beforeEach(() => {
    t = 0;
  });

  it("allows up to the limit, then blocks until the window resets", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000, now });
    expect([1, 2, 3].map(() => limiter.check("a").ok)).toEqual([true, true, true]);
    expect(limiter.check("a")).toEqual({ ok: false, retryAfterMs: 1000 });

    t = 400;
    expect(limiter.check("a")).toEqual({ ok: false, retryAfterMs: 600 });

    t = 1000;
    expect(limiter.check("a").ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now });
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
    expect(limiter.check("b").ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the last X-Forwarded-For entry, ignoring client-supplied ones", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 1.2.3.4" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");
  });

  it("falls back to X-Real-IP, then a shared bucket", () => {
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
