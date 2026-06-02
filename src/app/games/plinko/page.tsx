"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { CircleDot } from "lucide-react";
import { BetInput } from "@/components/ui/BetInput";
import { useBalance } from "@/context/BalanceContext";
import { getMultiplierTable } from "@/lib/game-engine/plinko";
import { cn } from "@/lib/cn";
import type { PlinkoRisk } from "@/lib/game-engine/plinko";

// ─── Board constants ─────────────────────────────────────────────────────────

const SVG_W = 420;
const SVG_H = 500;
const PADDING = 16;
const TOP_Y = 30;
const BUCKET_H = 52;
const PEG_AREA_H = SVG_H - TOP_Y - BUCKET_H;
const BALL_R = 7;
const BASE_STEP_MS = 120;

/**
 * Key fix: divide by (rows + 1) not rows.
 * A board with `rows` rows produces rows+1 buckets.
 * Each bucket must have the same width as the peg-to-peg spacing.
 * Total span = (rows+1) * S must equal (SVG_W - 2*PADDING).
 */
function S(rows: number) {
  return (SVG_W - 2 * PADDING) / (rows + 1);
}

function RH(rows: number) {
  return PEG_AREA_H / rows;
}

const CX = SVG_W / 2;

/** x of peg j in row r */
function pegX(r: number, j: number, rows: number) {
  return CX + (j - r / 2) * S(rows);
}

/** y of peg row r */
function pegY(r: number, rows: number) {
  return TOP_Y + r * RH(rows);
}

/** Ball x after `step` bounces with `rCount` R-moves taken */
function bx(rCount: number, step: number, rows: number) {
  return CX + (rCount - step / 2) * S(rows);
}

/** Ball y — at peg row `step`, or in bucket when step >= rows */
function by(step: number, rows: number) {
  if (step >= rows) return TOP_Y + rows * RH(rows) + BUCKET_H * 0.35;
  return TOP_Y + step * RH(rows);
}

/** Center x of bucket j */
function bucketCX(j: number, rows: number) {
  return PADDING + (j + 0.5) * S(rows);
}

function mColor(m: number) {
  if (m >= 50)  return { fill: "rgba(232,93,4,0.95)", text: "#fff",     stroke: "#e85d04" };
  if (m >= 10)  return { fill: "rgba(232,93,4,0.55)", text: "#e85d04",  stroke: "#e85d04" };
  if (m >= 3)   return { fill: "rgba(244,140,6,0.35)", text: "#f48c06", stroke: "#f48c06" };
  if (m >= 1.5) return { fill: "rgba(255,255,255,0.07)", text: "#c9d3dd", stroke: "rgba(255,255,255,0.15)" };
  if (m >= 1)   return { fill: "rgba(255,255,255,0.04)", text: "#6a5a42", stroke: "rgba(255,255,255,0.08)" };
  return         { fill: "rgba(239,68,68,0.25)", text: "#ef4444",  stroke: "rgba(239,68,68,0.45)" };
}

// ─── SVG Board ───────────────────────────────────────────────────────────────

function PlinkoBoard({
  rows,
  risk,
  path,
  ballStep,
  activeBucket,
}: {
  rows: 8 | 12 | 16;
  risk: PlinkoRisk;
  path: Array<"L" | "R"> | null;
  ballStep: number;
  activeBucket: number | null;
}) {
  const spacing = S(rows);
  const rowH = RH(rows);
  const pr = Math.max(2.5, 4.5 - (rows - 8) * 0.12);
  const table = getMultiplierTable(rows, risk);
  const fontSize = Math.max(7, Math.min(11, spacing * 0.52));

  // Compute ball position
  let ballPosX = CX;
  let ballPosY = TOP_Y - rowH * 0.6; // slightly above first peg initially
  let rCount = 0;

  if (path && ballStep >= 0) {
    const steps = Math.min(ballStep, path.length);
    for (let i = 0; i < steps; i++) {
      if (path[i] === "R") rCount++;
    }
    ballPosX = bx(rCount, steps, rows);
    ballPosY = by(steps, rows);
  }

  const stepMs = path ? Math.max(30, BASE_STEP_MS - (rows - 8) * 2) : BASE_STEP_MS;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ maxHeight: 480 }}>
      {/* Pegs */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: r + 1 }, (_, j) => (
          <circle
            key={`${r}-${j}`}
            cx={pegX(r, j, rows)}
            cy={pegY(r, rows)}
            r={pr}
            fill="white"
            opacity={0.22}
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
        const isActive = activeBucket === i;

        return (
          <g key={i}>
            <rect
              x={cx - bw / 2} y={buY}
              width={bw} height={bh} rx={3}
              fill={col.fill} stroke={col.stroke} strokeWidth={isActive ? 2 : 1}
            />
            {isActive && (
              <rect x={cx - bw / 2} y={buY} width={bw} height={bh} rx={3}
                fill="rgba(255,255,255,0.18)" />
            )}
            <text
              x={cx} y={buY + bh / 2}
              textAnchor="middle" dominantBaseline="middle"
              fill={col.text} fontSize={fontSize} fontWeight="700"
            >
              {m}×
            </text>
          </g>
        );
      })}

      {/* Ball */}
      {path && ballStep >= 0 && (
        <circle
          r={BALL_R}
          fill="#e85d04"
          style={{
            transform: `translate(${ballPosX}px, ${ballPosY}px)`,
            transition:
              ballStep <= 1
                ? `transform ${stepMs * 0.7}ms ease-out`
                : `transform ${stepMs * 0.85}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            filter: "drop-shadow(0 0 7px rgba(232,93,4,0.95))",
          }}
        />
      )}
    </svg>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

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
  const [lastResult, setLastResult] = useState<PlinkoResult | null>(null);
  const [history, setHistory] = useState<{ multiplier: number; profit: number }[]>([]);

  // Multi-ball session state
  const [sessionProfit, setSessionProfit] = useState<number | null>(null);
  const [ballsCompleted, setBallsCompleted] = useState(0);
  const [ballsTotal, setBallsTotal] = useState(0);

  // Animation state
  const [ballStep, setBallStep] = useState(-1);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  const [animPath, setAnimPath] = useState<Array<"L" | "R"> | null>(null);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (animRef.current) clearTimeout(animRef.current); }, []);

  const animateBall = useCallback(
    (path: Array<"L" | "R">, onDone: () => void) => {
      const stepMs = Math.max(30, BASE_STEP_MS - (rows - 8) * 2);
      setAnimPath(path);
      setActiveBucket(null);
      setBallStep(0);

      let step = 1;
      const tick = () => {
        setBallStep(step);
        if (step < path.length) {
          step++;
          animRef.current = setTimeout(tick, stepMs);
        } else {
          // Final step: land in bucket
          animRef.current = setTimeout(() => {
            setBallStep(path.length);
            setActiveBucket(null); // will be set after brief pause
            animRef.current = setTimeout(() => {
              onDone();
            }, 180);
          }, stepMs);
        }
      };

      animRef.current = setTimeout(tick, stepMs * 0.6);
    },
    [rows]
  );

  const drop = useCallback(async () => {
    if (betAmount * ballCount > balance || dropping) return;
    if (animRef.current) clearTimeout(animRef.current);

    setDropping(true);
    setSessionProfit(null);
    setBallsCompleted(0);
    setBallsTotal(ballCount);
    setActiveBucket(null);
    setAnimPath(null);
    setBallStep(-1);
    setLastResult(null);

    try {
      const res = await fetch("/api/games/plinko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, rows, risk, count: ballCount }),
      });
      const raw = await res.json();
      const results: PlinkoResult[] = ballCount === 1 ? [raw] : raw;

      let totalProfit = 0;
      results.forEach((r) => {
        totalProfit += r.profit;
        applyProfit(r.profit);
        setHistory((h) => [{ multiplier: r.multiplier, profit: r.profit }, ...h].slice(0, 30));
      });

      // Animate one ball at a time
      let i = 0;
      const runNext = () => {
        if (i >= results.length) {
          setActiveBucket(results[results.length - 1].bucketIndex);
          setSessionProfit(totalProfit);
          setDropping(false);
          return;
        }
        const r = results[i];
        setLastResult(r);
        setBallsCompleted(i + 1);
        animateBall(r.path, () => {
          setActiveBucket(r.bucketIndex);
          i++;
          // Pause between balls (shorter for large counts)
          const pause = ballCount > 10 ? 50 : ballCount > 3 ? 150 : 350;
          animRef.current = setTimeout(runNext, pause);
        });
      };

      runNext();
    } catch {
      setDropping(false);
    }
  }, [betAmount, ballCount, balance, rows, risk, dropping, applyProfit, animateBall]);

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
          <p className="text-xs text-[var(--muted)]">Drop balls · Watch them bounce · Land on a multiplier</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Board */}
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 overflow-hidden">
          <PlinkoBoard
            rows={rows}
            risk={risk}
            path={animPath}
            ballStep={ballStep}
            activeBucket={activeBucket}
          />

          {/* Landing / session result */}
          <div className="min-h-[28px] mt-1 text-center">
            {dropping && ballsTotal > 1 && (
              <p className="text-xs text-[var(--muted)]">
                Ball <span className="text-[var(--text)] font-bold">{ballsCompleted}</span> of {ballsTotal}
                {lastResult && (
                  <span className={cn("ml-2 font-bold", lastResult.multiplier >= 1 ? "text-[var(--win)]" : "text-[var(--lose)]")}>
                    {lastResult.multiplier}×
                  </span>
                )}
              </p>
            )}
            {!dropping && sessionProfit !== null && (
              <p className={cn("text-sm font-black", sessionProfit >= 0 ? "text-[var(--win)]" : "text-[var(--lose)]")}>
                {ballsTotal > 1 ? `${ballsTotal} balls · ` : ""}
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
                {ROWS_OPTIONS.map((r) => (
                  <button key={r}
                    onClick={() => { setRows(r); setBallStep(-1); setActiveBucket(null); }}
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
                {RISK_OPTIONS.map((r) => (
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
                {BALL_COUNT_OPTIONS.map((n) => (
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

            {/* Total bet preview */}
            {ballCount > 1 && (
              <p className="text-xs text-[var(--muted)] text-center -mt-1">
                Total bet: <span className="text-[var(--text)] font-semibold">${totalBet.toFixed(2)}</span>
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
              {dropping
                ? ballsTotal > 1
                  ? `Ball ${ballsCompleted} / ${ballsTotal}…`
                  : "Dropping…"
                : ballCount === 1
                ? "Drop Ball"
                : `Drop ${ballCount} Balls`}
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
            Provably Fair — Last Ball
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
