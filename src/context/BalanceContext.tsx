"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

const STARTING_BALANCE = 1_000_00; // 1000.00 chips in minor units

interface BalanceContextValue {
  balance: number;      // minor units (divide by 100 to display)
  applyProfit: (profit: number) => void;
  reset: () => void;
  fmt: (minor: number) => string;
}

const BalanceContext = createContext<BalanceContextValue | null>(null);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(STARTING_BALANCE);

  const applyProfit = useCallback((profit: number) => {
    setBalance((b) => Math.max(0, b + profit));
  }, []);

  const reset = useCallback(() => setBalance(STARTING_BALANCE), []);

  const fmt = useCallback(
    (minor: number) => (minor / 100).toFixed(2),
    []
  );

  return (
    <BalanceContext.Provider value={{ balance, applyProfit, reset, fmt }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const ctx = useContext(BalanceContext);
  if (!ctx) throw new Error("useBalance must be used within BalanceProvider");
  return ctx;
}
