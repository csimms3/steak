"use client";

import { useState, useCallback, useRef } from "react";
import { CircleDot } from "lucide-react";
import { BetInput } from "@/components/ui/BetInput";
import { useBalance } from "@/context/BalanceContext";
import { getMultiplierTable } from "@/lib/game-engine/plinko";
import { cn } from "@/lib/cn";
import type { PlinkoRisk } from "@/lib/game-engine/plinko";

interface PlinkResult {
  path: Array<"L" | "R">;
  bucketIndex: number;
  multiplier: number;
  profit: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
}

const ROWS_OPTIONS = [8, 12, 16] as const;
const RISK_OPTIONS: PlinkoRisk[] = ["low", "medium", "high"];

function multiplierColor(m: number): string {
  if (m >= 10) return "bg-[var(--accent)] text-white border-[var(--accent)]";
  if (m >= 3) return "bg-amber-500/80 text-white border-amber-500";
  if (m >= 1.5) return "bg-yellow-600/60 text-[var(--text)] border-yellow-600/50";
  if (m >= 1) return "bg-[var(--surface-2)] text-[var(--text)] border-[var(--border)]";
  return "bg-[var(--lose)]/40 text-[var(--lose)] border-[var(--lose)]/40";
}

export default function PlinkoPage() {
  const { applyProfit, balance } = useBalance();
  const [betAmount, setBetAmount] = useState(100_00);
  const [rows, setRows] = useState<8 | 12 | 16>(8);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [dropping, setDropping] = useState(false);
  const [result, setResult] = useState<PlinkResult | null>(null);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  const [history, setHistory] = useState<{ multiplier: number; profit: number }[]>([]);

  const table = getMultiplierTable(rows, risk);

  const drop = useCallback(async () => {
    if (betAmount > balance || dropping) return;
    setDropping(true);
    setActiveBucket(null);
    setResult(null);

    try {
      const res = await fetch("/api/games/plinko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, rows, risk }),
      });
      const data: PlinkResult = await res.json();

      // Animate bucket highlight
      setTimeout(() => {
        setActiveBucket(data.bucketIndex);
        setResult(data);
        applyProfit(data.profit);
        setHistory((h) => [{ multiplier: data.multiplier, profit: data.profit }, ...h].slice(0, 20));
      }, 300);
    } finally {
      setTimeout(() => setDropping(false), 400);
    }
  }, [betAmount, balance, rows, risk, dropping, applyProfit]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <CircleDot className="text-purple-400" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Plinko</h1>
          <p className="text-xs text-[var(--muted)]">Drop the ball · Land on a multiplier</p>
        </div>
      </div>

      {/* Plinko board */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        {/* Pegs */}
        <div className="flex flex-col items-center gap-2 py-2">
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="flex gap-2.5">
              {Array.from({ length: row + 2 }, (_, _col) => (
                <div
                  key={_col}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    dropping ? "bg-[var(--accent)] animate-pulse" : "bg-[var(--muted)]/40"
                  )}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Buckets */}
        <div className="flex gap-1">
          {table.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 py-1.5 rounded-lg border text-center text-[10px] font-bold transition-all duration-300",
                multiplierColor(m),
                activeBucket === i && "scale-110 ring-2 ring-white/50 shadow-lg"
              )}
            >
              {m}×
            </div>
          ))}
        </div>

        {result && (
          <div className={cn(
            "text-center text-sm font-semibold py-2",
            result.profit >= 0 ? "text-[var(--win)]" : "text-[var(--lose)]"
          )}>
            {result.multiplier}× · {result.profit >= 0 ? "+" : ""}${(result.profit / 100).toFixed(2)}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        {/* Rows */}
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Rows</label>
          <div className="flex gap-2">
            {ROWS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRows(r)}
                disabled={dropping}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-sm font-semibold transition-all",
                  rows === r
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Risk */}
        <div className="space-y-1.5">
          <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Risk</label>
          <div className="flex gap-2">
            {RISK_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRisk(r)}
                disabled={dropping}
                className={cn(
                  "flex-1 py-2 rounded-lg border text-sm font-semibold capitalize transition-all",
                  risk === r
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <BetInput value={betAmount} onChange={setBetAmount} disabled={dropping} />

        <button
          onClick={drop}
          disabled={dropping || betAmount > balance}
          className="w-full py-3.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {dropping ? "Dropping…" : "Drop Ball"}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Recent Drops</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <span
                key={i}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold border",
                  multiplierColor(h.multiplier)
                )}
              >
                {h.multiplier}×
              </span>
            ))}
          </div>
        </div>
      )}

      {result && (
        <details className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 text-xs text-[var(--muted)]">
          <summary className="cursor-pointer font-semibold text-[var(--text)] hover:text-[var(--accent)]">
            Provably Fair Verification
          </summary>
          <div className="mt-3 space-y-1.5 font-mono break-all">
            <div><span className="text-[var(--muted)]">Server Seed: </span><span className="text-[var(--text)]">{result.serverSeed}</span></div>
            <div><span className="text-[var(--muted)]">Hash: </span><span className="text-[var(--text)]">{result.serverSeedHash}</span></div>
            <div><span className="text-[var(--muted)]">Client Seed: </span><span className="text-[var(--text)]">{result.clientSeed}</span></div>
            <div><span className="text-[var(--muted)]">Path: </span><span className="text-[var(--text)]">{result.path.join("")}</span></div>
          </div>
        </details>
      )}
    </div>
  );
}
