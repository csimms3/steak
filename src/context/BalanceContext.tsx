"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useSettings } from "./SettingsContext";

interface BalanceContextValue {
  balance: number;      // minor units (divide by 100 to display)
  applyProfit: (profit: number) => void;
  reset: () => void;
  fmt: (minor: number) => string;
}

const BalanceContext = createContext<BalanceContextValue | null>(null);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { startingBalance } = useSettings();
  const [balance, setBalance] = useState(startingBalance);

  const applyProfit = useCallback((profit: number) => {
    setBalance((b) => Math.max(0, b + profit));
  }, []);

  // Reads the *current* configured starting balance, not the value at mount —
  // so changing it in Settings takes effect the next time Reset is pressed.
  const reset = useCallback(() => setBalance(startingBalance), [startingBalance]);

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
