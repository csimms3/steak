"use client";

import Link from "next/link";
import { Wallet, RotateCcw, Zap } from "lucide-react";
import { useBalance } from "@/context/BalanceContext";

export function Header() {
  const { balance, reset, fmt } = useBalance();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 h-14 bg-[var(--surface)] border-b border-[var(--border)]">
      {/* Mobile logo — links home (sidebar is hidden below md) */}
      <Link href="/" className="md:hidden flex items-center gap-1.5 text-lg font-black text-[var(--text)] tracking-tight hover:text-[var(--accent)] transition-colors">
        <Zap size={18} className="text-[var(--accent)] fill-[var(--accent)]" />
        STEAK
      </Link>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5">
          <Wallet size={14} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text)] tabular-nums">
            ${fmt(balance)}
          </span>
        </div>
        <button
          onClick={reset}
          title="Reset balance to $1,000"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </button>
      </div>
    </header>
  );
}
