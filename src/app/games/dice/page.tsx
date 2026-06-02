"use client";

import { useState, useCallback } from "react";
import { Dice5, ChevronDown, ChevronUp } from "lucide-react";
import { BetInput } from "@/components/ui/BetInput";
import { useBalance } from "@/context/BalanceContext";
import { getDiceMultiplier } from "@/lib/game-engine/dice";
import { cn } from "@/lib/cn";

type Direction = "over" | "under";

interface DiceResult {
  roll: number;
  win: boolean;
  multiplier: number;
  profit: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export default function DicePage() {
  const { applyProfit, balance } = useBalance();
  const [betAmount, setBetAmount] = useState(100_00);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState<Direction>("over");
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<DiceResult | null>(null);
  const [history, setHistory] = useState<DiceResult[]>([]);

  const winProb =
    direction === "over" ? ((99 - target) / 100) * 100 : (target / 100) * 100;
  const multiplier = getDiceMultiplier(target, direction);

  const roll = useCallback(async () => {
    if (betAmount > balance || rolling) return;
    setRolling(true);
    setResult(null);

    try {
      const res = await fetch("/api/games/dice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, target, direction }),
      });
      const data: DiceResult = await res.json();
      setResult(data);
      setHistory((h) => [data, ...h].slice(0, 20));
      applyProfit(data.profit);
    } finally {
      setRolling(false);
    }
  }, [betAmount, balance, target, direction, rolling, applyProfit]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Dice5 className="text-blue-400" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Dice</h1>
          <p className="text-xs text-[var(--muted)]">Predict over or under · 1% house edge</p>
        </div>
      </div>

      {/* Roll display */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center space-y-2">
        <div
          className={cn(
            "text-7xl font-black tabular-nums transition-all duration-300",
            result
              ? result.win
                ? "text-[var(--win)]"
                : "text-[var(--lose)]"
              : "text-[var(--muted)]",
            rolling && "animate-pulse"
          )}
        >
          {rolling ? "…" : result ? result.roll.toFixed(2) : "00.00"}
        </div>
        {result && (
          <p
            className={cn(
              "text-sm font-semibold",
              result.win ? "text-[var(--win)]" : "text-[var(--lose)]"
            )}
          >
            {result.win
              ? `+$${(result.profit / 100).toFixed(2)} — ${result.multiplier}×`
              : `-$${(Math.abs(result.profit) / 100).toFixed(2)} — Bust`}
          </p>
        )}
      </div>

      {/* Target slider */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
        {/* Direction toggle */}
        <div className="flex gap-2">
          {(["over", "under"] as Direction[]).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border",
                direction === d
                  ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                  : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
              )}
            >
              {d === "over" ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              Roll {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Target input */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-[var(--muted)]">
            <span>Target: <span className="text-[var(--text)] font-semibold">{target}</span></span>
            <span>Win chance: <span className="text-[var(--text)] font-semibold">{winProb.toFixed(2)}%</span></span>
            <span>Payout: <span className="text-[var(--accent)] font-semibold">{multiplier}×</span></span>
          </div>
          <input
            type="range"
            min={2}
            max={98}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <div className="flex justify-between text-[10px] text-[var(--muted)]">
            <span>2 (risky)</span>
            <span>98 (safe)</span>
          </div>
        </div>

        <BetInput value={betAmount} onChange={setBetAmount} disabled={rolling} />

        <button
          onClick={roll}
          disabled={rolling || betAmount > balance}
          className="w-full py-3.5 rounded-xl bg-[var(--accent)] hover:opacity-90 active:scale-[0.99] text-white font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {rolling ? "Rolling…" : "Roll Dice"}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Recent Bets</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {history.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-[var(--surface-2)]"
              >
                <span className="tabular-nums text-[var(--text)] font-mono">{r.roll.toFixed(2)}</span>
                <span className="text-[var(--muted)]">{r.multiplier}×</span>
                <span className={r.win ? "text-[var(--win)] font-semibold" : "text-[var(--lose)]"}>
                  {r.win ? "+" : "-"}${(Math.abs(r.profit) / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provably fair */}
      {result && (
        <details className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 text-xs text-[var(--muted)]">
          <summary className="cursor-pointer font-semibold text-[var(--text)] hover:text-[var(--accent)]">
            Provably Fair Verification
          </summary>
          <div className="mt-3 space-y-1.5 font-mono break-all">
            <div><span className="text-[var(--muted)]">Server Seed: </span><span className="text-[var(--text)]">{result.serverSeed}</span></div>
            <div><span className="text-[var(--muted)]">Hash: </span><span className="text-[var(--text)]">{result.serverSeedHash}</span></div>
            <div><span className="text-[var(--muted)]">Client Seed: </span><span className="text-[var(--text)]">{result.clientSeed}</span></div>
            <div><span className="text-[var(--muted)]">Nonce: </span><span className="text-[var(--text)]">{result.nonce}</span></div>
          </div>
        </details>
      )}
    </div>
  );
}
