"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useSettings } from "./SettingsContext";

const STORAGE_KEY = "steak:balance";

interface BalanceContextValue {
  balance: number;      // minor units (divide by 100 to display)
  applyProfit: (profit: number) => void;
  /** Authenticated path: sets balance directly from a server-authoritative
   *  response, bypassing local math and localStorage entirely. */
  syncBalance: (next: number) => void;
  reset: () => void;
  fmt: (minor: number) => string;
}

const BalanceContext = createContext<BalanceContextValue | null>(null);

function loadStoredBalance(fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw !== null ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { startingBalance } = useSettings();
  const { status } = useSession();
  const authenticated = status === "authenticated";

  // Lazy initializer runs once on the client's first render — no effect needed,
  // and loadStoredBalance() falls back to the configured starting balance when
  // nothing has been persisted yet (e.g. first visit, or storage was cleared).
  // Authenticated users get this guest-mode value overwritten below once their
  // real balance loads from the server.
  const [balance, setBalance] = useState(() => loadStoredBalance(startingBalance));

  const syncBalance = useCallback((next: number) => {
    setBalance(next);
  }, []);

  // Hydrate from the server once a session exists — the DB balance is the
  // source of truth for authenticated play, not localStorage.
  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    fetch("/api/user/balance")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setBalance(data.balance);
      });
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  const persist = useCallback((next: number) => {
    setBalance(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    }
  }, []);

  const applyProfit = useCallback((profit: number) => {
    setBalance((b) => {
      const next = Math.max(0, b + profit);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  // Reads the *current* configured starting balance, not the value at mount —
  // so changing it in Settings takes effect the next time Reset is pressed.
  const reset = useCallback(() => {
    if (authenticated) {
      fetch("/api/user/balance/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startingBalance }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setBalance(data.balance);
        });
      return;
    }
    persist(startingBalance);
  }, [authenticated, persist, startingBalance]);

  const fmt = useCallback(
    (minor: number) => (minor / 100).toFixed(2),
    []
  );

  return (
    <BalanceContext.Provider value={{ balance, applyProfit, syncBalance, reset, fmt }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const ctx = useContext(BalanceContext);
  if (!ctx) throw new Error("useBalance must be used within BalanceProvider");
  return ctx;
}
