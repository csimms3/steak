"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { CircleDot } from "lucide-react";
import { BetInput } from "@/components/ui/BetInput";
import { useBalance } from "@/context/BalanceContext";
import { getMultiplierTable } from "@/lib/game-engine/plinko";
import { cn } from "@/lib/cn";
import type { PlinkoRisk } from "@/lib/game-engine/plinko";

// ─── Board geometry ───────────────────────────────────────────────────────────

const SVG_W = 420;
const SVG_H = 500;
const PADDING = 16;
const TOP_Y = 30;
const BUCKET_H = 52;
const PEG_AREA_H = SVG_H - TOP_Y - BUCKET_H;
const BALL_R = 6;

// spacing: (rows+1) buckets across (SVG_W - 2*PADDING)
const S = (rows: number) => (SVG_W - 2 * PADDING) / (rows + 1);
const RH = (rows: number) => PEG_AREA_H / rows;
const CX = SVG_W / 2;

const pegX = (r: number, j: number, rows: number) => CX + (j - r / 2) * S(rows);
const pegY = (r: number, rows: number) => TOP_Y + r * RH(rows);

// Ball x at a given step (number of bounces taken) with rCount R-moves accumulated
const ballX = (rCount: number, step: number, rows: number) =>
  CX + (rCount - step / 2) * S(rows);

// Ball y: in peg zone when step < rows, in bucket zone when done
const ballY = (step: number, rows: number) =>
  step >= rows
    ? TOP_Y + rows * RH(rows) + BUCKET_H * 0.32
    : TOP_Y + step * RH(rows);

const bucketCX = (j: number, rows: number) => PADDING + (j + 0.5) * S(rows);

function mColor(m: number) {
  if (m >= 50)  return { fill: "rgba(232,93,4,0.95)", text: "#fff",      stroke: "#e85d04" };
  if (m >= 10)  return { fill: "rgba(232,93,4,0.55)", text: "#e85d04",   stroke: "#e85d04" };
  if (m >= 3)   return { fill: "rgba(244,140,6,0.35)", text: "#f48c06",  stroke: "#f48c06" };
  if (m >= 1.5) return { fill: "rgba(255,255,255,0.07)", text: "#c9d3dd", stroke: "rgba(255,255,255,0.15)" };
  if (m >= 1)   return { fill: "rgba(255,255,255,0.04)", text: "#6a5a42",  stroke: "rgba(255,255,255,0.08)" };
  return         { fill: "rgba(239,68,68,0.25)", text: "#ef4444",   stroke: "rgba(239,68,68,0.45)" };
}

// ─── Ball animation state ─────────────────────────────────────────────────────

interface BallAnim {
  path: Array<"L" | "R">;
  bucketIndex: number;
  // step = current peg row (0 = top peg, rows = landed in bucket)
  step: number;
  // rCount = R-moves taken so far → determines horizontal position
  rCount: number;
}

// ─── SVG Board ────────────────────────────────────────────────────────────────

function PlinkoBoard({
  rows, risk, balls, stepMs,
}: {
  rows: 8 | 12 | 16;
  risk: PlinkoRisk;
  balls: BallAnim[];
  stepMs: number;
}) {
  const spacing = S(rows);
  const rowH = RH(rows);
  const pr = Math.max(2.5, 4.5 - (rows - 8) * 0.12);
  const table = getMultiplierTable(rows, risk);
  const fontSize = Math.max(7, Math.min(11, spacing * 0.52));

  // Count how many balls landed in each bucket
  const landedCount: Record<number, number> = {};
  for (const b of balls) {
    if (b.step >= rows) {
      landedCount[b.bucketIndex] = (landedCount[b.bucketIndex] ?? 0) + 1;
    }
  }

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 480 }}>
      {/* Pegs */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: r + 1 }, (_, j) => (
          <circle key={`${r}-${j}`}
            cx={pegX(r, j, rows)} cy={pegY(r, rows)} r={pr}
            fill="white" opacity={0.22}
          />
        ))
      )}

      {/* Buckets */}
      {table.map((m, i) => {
        const cx = bucketCX(i, rows);
        const bw = spacing - 3;
        const buY = TOP_Y + rows * rowH + 8;
        const bh = BUCKET_H - 18;
        const col = mColor(m);
        const count = landedCount[i] ?? 0;
        const isActive = count > 0;

        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={buY} width={bw} height={bh} rx={3}
              fill={col.fill} stroke={col.stroke} strokeWidth={isActive ? 2 : 1}
            />
            {isActive && (
              <rect x={cx - bw / 2} y={buY} width={bw} height={bh} rx={3}
                fill={`rgba(255,255,255,${Math.min(0.25, count * 0.08)})`}
              />
            )}
            <text x={cx} y={buY + bh / 2}
              textAnchor="middle" dominantBaseline="middle"
              fill={col.text} fontSize={fontSize} fontWeight="700"
            >
              {m}×
            </text>
          </g>
        );
      })}

      {/* All balls — rendered simultaneously */}
      {balls.map((ball, i) => {
        const step = Math.min(ball.step, ball.path.length);
        const x = ballX(ball.rCount, step, rows);
        const y = ballY(step, rows);
        const landed = ball.step >= ball.path.length;

        return (
          <circle key={i} r={BALL_R}
            fill={landed ? "#f48c06" : "#e85d04"}
            opacity={landed ? 0.7 : 1}
            style={{
              transform: `translate(${x}px, ${y}px)`,
              transition: `transform ${stepMs * 0.82}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
              filter: landed
                ? "drop-shadow(0 0 4px rgba(244,140,6,0.7))"
                : "drop-shadow(0 0 7px rgba(232,93,4,0.95))",
            }}
          />
        );
      })}
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ROWS_OPTIONS = [8, 12, 16] as const;
const RISK_OPTIONS: PlinkoRisk[] = ["low", "medium", "high"];
const BALL_COUNT_OPTIONS = [1, 3, 5, 10, 25, 100] as const;

interface PlinkoResult {
  path: Array<"L" | "R">;
  bucketIndex: number;
  multiplier: number;
  profit: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
}

export default function PlinkoPage() {
  const { applyProfit, balance } = useBalance();
  const [betAmount, setBetAmount] = useState(100_00);
  const [rows, setRows] = useState<8 | 12 | 16>(8);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [ballCount, setBallCount] = useState<1 | 3 | 5 | 10 | 25 | 100>(1);
  const [dropping, setDropping] = useState(false);
  const [balls, setBalls] = useState<BallAnim[]>([]);
  const [sessionProfit, setSessionProfit] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<PlinkoResult | null>(null);
  const [history, setHistory] = useState<{ multiplier: number; profit: number }[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalProfitRef = useRef(0);
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  // Step ms: faster for more balls so animation stays snappy
  const stepMs = ballCount > 25 ? 60 : ballCount > 5 ? 80 : 110;

  // Detect when all balls have landed
  useEffect(() => {
    if (!dropping || balls.length === 0) return;
    if (balls.every(b => b.step >= b.path.length)) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDropping(false);
      setSessionProfit(totalProfitRef.current);
    }
  }, [balls, dropping]);

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const drop = useCallback(async () => {
    if (betAmount * ballCount > balance || dropping) return;
    if (intervalRef.current !== null) clearInterval(intervalRef.current);

    setDropping(true);
    setSessionProfit(null);
    setBalls([]);
    setLastResult(null);

    try {
      const res = await fetch("/api/games/plinko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, rows, risk, count: ballCount }),
      });
      const raw = await res.json();
      const results: PlinkoResult[] = ballCount === 1 ? [raw] : raw;

      // Apply profit and update history immediately (all resolved server-side)
      let total = 0;
      results.forEach(r => {
        total += r.profit;
        applyProfit(r.profit);
        setHistory(h => [{ multiplier: r.multiplier, profit: r.profit }, ...h].slice(0, 40));
      });
      totalProfitRef.current = total;
      setLastResult(results[results.length - 1]);

      // Init all balls at step 0 simultaneously
      const initBalls: BallAnim[] = results.map(r => ({
        path: r.path,
        bucketIndex: r.bucketIndex,
        step: 0,
        rCount: 0,
      }));
      setBalls(initBalls);

      // Single shared interval advances every ball by one step per tick
      intervalRef.current = setInterval(() => {
        setBalls(prev => {
          const allDone = prev.every(b => b.step >= b.path.length);
          if (allDone) return prev; // guard: useEffect will clear interval

          return prev.map(ball => {
            if (ball.step >= ball.path.length) return ball;
            const dir = ball.path[ball.step];
            return {
              ...ball,
              step: ball.step + 1,
              rCount: ball.rCount + (dir === "R" ? 1 : 0),
            };
          });
        });
      }, stepMs);

    } catch {
      setDropping(false);
    }
  }, [betAmount, ballCount, balance, rows, risk, dropping, applyProfit, stepMs]);

  const totalBet = (betAmount * ballCount) / 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <CircleDot className="text-purple-400" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Plinko</h1>
          <p className="text-xs text-[var(--muted)]">Drop balls simultaneously · Land on a multiplier</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Board */}
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 overflow-hidden">
          <PlinkoBoard rows={rows} risk={risk} balls={balls} stepMs={stepMs} />

          {/* Status line */}
          <div className="min-h-[26px] mt-1 text-center">
            {dropping && (
              <p className="text-xs text-[var(--muted)] animate-pulse">
                {ballCount > 1 ? `${ballCount} balls dropping…` : "Dropping…"}
              </p>
            )}
            {!dropping && sessionProfit !== null && (
              <p className={cn("text-sm font-black", sessionProfit >= 0 ? "text-[var(--win)]" : "text-[var(--lose)]")}>
                {ballCount > 1 ? `${ballCount} balls · ` : ""}
                {sessionProfit >= 0 ? "+" : ""}${(sessionProfit / 100).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="lg:w-64 space-y-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
            {/* Rows */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Rows</label>
              <div className="flex gap-1.5">
                {ROWS_OPTIONS.map(r => (
                  <button key={r}
                    onClick={() => { setRows(r); setBalls([]); }}
                    disabled={dropping}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-sm font-bold transition-all",
                      rows === r
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-[0_0_14px_rgba(232,93,4,0.3)]"
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
              <div className="flex gap-1.5">
                {RISK_OPTIONS.map(r => (
                  <button key={r}
                    onClick={() => setRisk(r)}
                    disabled={dropping}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-xs font-bold capitalize transition-all",
                      risk === r
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-[0_0_14px_rgba(232,93,4,0.3)]"
                        : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Ball count */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Balls</label>
              <div className="grid grid-cols-3 gap-1.5">
                {BALL_COUNT_OPTIONS.map(n => (
                  <button key={n}
                    onClick={() => setBallCount(n as typeof ballCount)}
                    disabled={dropping}
                    className={cn(
                      "py-1.5 rounded-lg border text-xs font-bold transition-all",
                      ballCount === n
                        ? "bg-purple-500/80 border-purple-400 text-white"
                        : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <BetInput value={betAmount} onChange={setBetAmount} disabled={dropping} />

            {ballCount > 1 && (
              <p className="text-xs text-[var(--muted)] text-center -mt-1">
                Total: <span className="text-[var(--text)] font-semibold">${totalBet.toFixed(2)}</span>
              </p>
            )}

            <button
              onClick={drop}
              disabled={dropping || betAmount * ballCount > balance}
              className={cn(
                "w-full py-3 rounded-xl font-black text-base transition-all",
                "bg-[var(--accent)] text-white hover:opacity-90 active:scale-[0.99]",
                "shadow-[0_0_25px_rgba(232,93,4,0.2)] hover:shadow-[0_0_35px_rgba(232,93,4,0.4)]",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {dropping ? "Dropping…" : ballCount === 1 ? "Drop Ball" : `Drop ${ballCount} Balls`}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 space-y-2">
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">History</p>
              <div className="flex flex-wrap gap-1">
                {history.map((h, i) => {
                  const col = mColor(h.multiplier);
                  return (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold border"
                      style={{ background: col.fill, color: col.text, borderColor: col.stroke }}>
                      {h.multiplier}×
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Provably fair */}
      {lastResult && (
        <details className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 text-xs">
          <summary className="cursor-pointer font-semibold text-[var(--text)] hover:text-[var(--accent)]">
            Provably Fair — {ballCount > 1 ? "Last Ball" : "Verification"}
          </summary>
          <div className="mt-3 space-y-1.5 font-mono break-all text-[var(--muted)]">
            <div><span>Server Seed: </span><span className="text-[var(--text)]">{lastResult.serverSeed}</span></div>
            <div><span>Hash: </span><span className="text-[var(--text)]">{lastResult.serverSeedHash}</span></div>
            <div><span>Client Seed: </span><span className="text-[var(--text)]">{lastResult.clientSeed}</span></div>
            <div><span>Path: </span><span className="text-[var(--text)]">{lastResult.path.join("")}</span></div>
          </div>
        </details>
      )}
    </div>
  );
}
