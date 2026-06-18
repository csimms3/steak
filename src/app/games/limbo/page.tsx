"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Rocket } from "lucide-react";
import { BetInput } from "@/components/ui/BetInput";
import { GameShell, type ProvablyFair } from "@/components/ui/GameShell";
import { useBalance } from "@/context/BalanceContext";
import { getLimboWinChance } from "@/lib/game-engine/limbo";
import { cn } from "@/lib/cn";

interface LimboResponse {
  result: number; win: boolean; multiplier: number; profit: number;
  serverSeed: string; serverSeedHash: string; clientSeed: string; nonce: number;
}

export default function LimboPage() {
  const { applyProfit, balance } = useBalance();
  const [betAmount, setBetAmount] = useState(100_00);
  const [target, setTarget] = useState(2);
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState(1);
  const [last, setLast] = useState<LimboResponse | null>(null);
  const [history, setHistory] = useState<{ result: number; win: boolean }[]>([]);
  const rafRef = useRef<number>(0);

  const winChance = getLimboWinChance(target);

  const animateTo = useCallback((final: number) => {
    const start = performance.now();
    const DUR = 600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DUR);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(1 + (final - 1) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setDisplay(final);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const roll = useCallback(async () => {
    if (betAmount > balance || rolling) return;
    setRolling(true);
    setLast(null);
    try {
      const res = await fetch("/api/games/limbo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, target }),
      });
      const data: LimboResponse = await res.json();
      animateTo(data.result);
      applyProfit(data.profit);
      setHistory((h) => [{ result: data.result, win: data.win }, ...h].slice(0, 20));
      setTimeout(() => { setLast(data); setRolling(false); }, 650);
    } catch {
      setRolling(false);
    }
  }, [betAmount, balance, target, rolling, applyProfit, animateTo]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const won = last?.win ?? null;
  const fair: ProvablyFair | null = last
    ? { serverSeed: last.serverSeed, serverSeedHash: last.serverSeedHash, clientSeed: last.clientSeed, nonce: last.nonce,
        extra: [{ label: "Result", value: `${last.result.toFixed(2)}×` }] }
    : null;

  return (
    <GameShell title="Limbo" subtitle="Set a target multiplier · Beat it to win · 1% house edge"
      icon={Rocket} iconClass="bg-sky-500/10 border-sky-500/20 text-sky-400" fair={fair}>
      {/* Result display — full width */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center py-20">
        <span className={cn("text-7xl font-black tabular-nums transition-colors",
          won === null ? "text-[var(--muted)]" : won ? "text-[var(--win)]" : "text-[var(--lose)]")}>
          {display.toFixed(2)}×
        </span>
        {history.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mt-6 px-4">
            {history.map((h, i) => (
              <span key={i} className={cn("px-2 py-0.5 rounded text-[10px] font-bold border",
                h.win ? "text-[var(--win)] border-[var(--win)]/30 bg-[var(--win)]/10"
                      : "text-[var(--lose)] border-[var(--lose)]/30 bg-[var(--lose)]/10")}>
                {h.result.toFixed(2)}×
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Controls — horizontal row on desktop */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="space-y-1.5 md:w-44">
            <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Target Multiplier</label>
            <div className="relative">
              <input type="number" min={1.01} max={1000000} step={0.01} value={target}
                onChange={(e) => setTarget(Math.max(1.01, Math.min(1_000_000, parseFloat(e.target.value) || 1.01)))}
                disabled={rolling}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-3 pr-7 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] disabled:opacity-50" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">×</span>
            </div>
          </div>
          <div className="space-y-1.5 md:w-36">
            <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Win Chance</label>
            <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text)] tabular-nums">
              {winChance.toFixed(2)}%
            </div>
          </div>
          <div className="flex-1">
            <BetInput value={betAmount} onChange={setBetAmount} disabled={rolling} />
          </div>
          <button onClick={roll} disabled={rolling || betAmount > balance}
            className={cn("w-full md:w-36 py-3 rounded-xl font-black text-base transition-all shrink-0",
              "bg-[var(--accent)] text-white hover:opacity-90 active:scale-[0.99]",
              "shadow-[0_0_25px_rgba(232,93,4,0.2)] hover:shadow-[0_0_35px_rgba(232,93,4,0.4)]",
              "disabled:opacity-40 disabled:cursor-not-allowed")}>
            {rolling ? "Rolling…" : "Roll"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
