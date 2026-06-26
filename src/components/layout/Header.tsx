"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, RotateCcw, Zap, Settings } from "lucide-react";
import { useBalance } from "@/context/BalanceContext";
import { cn } from "@/lib/cn";

export function Header() {
  const { balance, reset, fmt } = useBalance();
  const path = usePathname();

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
          title="Reset balance to your configured starting amount"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)] transition-colors"
        >
          <RotateCcw size={12} />
          Reset
        </button>
        <Link
          href="/settings"
          title="Settings"
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border transition-colors",
            path === "/settings"
              ? "bg-[var(--accent)] border-[var(--accent)] text-white"
              : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--accent)]"
          )}
        >
          <Settings size={14} />
        </Link>
      </div>
    </header>
  );
}
