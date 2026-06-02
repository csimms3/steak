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
const PADDING = 18;       // horizontal padding inside SVG
const TOP_Y = 30;         // y of row-0 peg
const BUCKET_H = 52;      // height reserved for bucket area
const PEG_AREA_H = SVG_H - TOP_Y - BUCKET_H;
const BALL_R = 7;
const PEG_R = 4;
const STEP_MS = 130;      // ms per row during animation

function pegSpacing(rows: number) {
  return (SVG_W - 2 * PADDING) / rows;
}

function rowHeight(rows: number) {
  return PEG_AREA_H / rows;
}

/** x coordinate of peg j in row r */
function pegX(r: number, j: number, rows: number) {
  return SVG_W / 2 + (j - r / 2) * pegSpacing(rows);
}

/** y coordinate of peg row r */
function pegY(r: number, rows: number) {
  return TOP_Y + r * rowHeight(rows);
}

/** Ball x after `step` bounces with `rCount` R-moves */
function ballX(rCount: number, step: number, rows: number) {
  return SVG_W / 2 + (rCount - step / 2) * pegSpacing(rows);
}

/** Ball y at peg row `step` (or bucket area when step === rows) */
function ballYPos(step: number, rows: number) {
  if (step >= rows) return TOP_Y + rows * rowHeight(rows) + BUCKET_H / 2 - 8;
  return TOP_Y + step * rowHeight(rows);
}

/** Bucket center x for bucket index j */
function bucketCX(j: number, rows: number) {
  return PADDING + (j + 0.5) * pegSpacing(rows);
}

function multiplierColor(m: number) {
  if (m >= 50)  return { fill: "rgba(232,93,4,0.9)",  text: "#fff",    stroke: "#e85d04" };
  if (m >= 10)  return { fill: "rgba(232,93,4,0.5)",  text: "#e85d04", stroke: "#e85d04" };
  if (m >= 3)   return { fill: "rgba(244,140,6,0.35)", text: "#f48c06", stroke: "#f48c06" };
  if (m >= 1.5) return { fill: "rgba(255,255,255,0.07)", text: "#d4c5a9", stroke: "rgba(255,255,255,0.15)" };
  if (m >= 1)   return { fill: "rgba(255,255,255,0.04)", text: "#7a6a52",  stroke: "rgba(255,255,255,0.08)" };
  return       { fill: "rgba(239,68,68,0.25)",  text: "#ef4444", stroke: "rgba(239,68,68,0.5)" };
}

// ─── SVG Board component ─────────────────────────────────────────────────────

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
  const S = pegSpacing(rows);
  const RH = rowHeight(rows);
  const pr = Math.max(2.5, PEG_R - (rows - 8) * 0.15);

  // Compute ball position
  let bx = SVG_W / 2;
  let by = TOP_Y - RH;  // start above board
  let rCount = 0;

  if (path && ballStep >= 0) {
    const steps = Math.min(ballStep, path.length);
    for (let i = 0; i < steps; i++) {
      if (path[i] === "R") rCount++;
    }
    bx = ballX(rCount, steps, rows);
    by = ballYPos(steps, rows);
  }

  const table = getMultiplierTable(rows, risk);
  const fontSize = Math.max(7, Math.min(11, S * 0.55));

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full"
      style={{ maxHeight: 500 }}
    >
      {/* Peg rows */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: r + 1 }, (_, j) => (
          <circle
            key={`${r}-${j}`}
            cx={pegX(r, j, rows)}
            cy={pegY(r, rows)}
            r={pr}
            fill="white"
            opacity={0.25}
          />
        ))
      )}

      {/* Buckets */}
      {table.map((m, i) => {
        const cx = bucketCX(i, rows);
        const bw = S - 3;
        const by2 = TOP_Y + rows * RH + 6;
        const bh = BUCKET_H - 14;
        const col = multiplierColor(m);
        const isActive = activeBucket === i;

        return (
          <g key={i}>
            <rect
              x={cx - bw / 2}
              y={by2}
              width={bw}
              height={bh}
              rx={4}
              fill={col.fill}
              stroke={col.stroke}
              strokeWidth={isActive ? 2 : 1}
              opacity={isActive ? 1 : 0.85}
              style={{ transition: "opacity 0.2s" }}
            />
            {isActive && (
              <rect
                x={cx - bw / 2}
                y={by2}
                width={bw}
                height={bh}
                rx={4}
                fill="rgba(255,255,255,0.15)"
              />
            )}
            <text
              x={cx}
              y={by2 + bh / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={col.text}
              fontSize={fontSize}
              fontWeight="700"
            >
              {m >= 10 ? `${m}×` : `${m}×`}
            </text>
          </g>
        );
      })}

      {/* Ball — only shown when animation is active */}
      {path && ballStep >= 0 && (
        <circle
          r={BALL_R}
          fill="#e85d04"
          style={{
            transform: `translate(${bx}px, ${by}px)`,
            transition: ballStep === 0
              ? "transform 200ms ease-out"
              : `transform ${STEP_MS * 0.85}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            filter: "drop-shadow(0 0 8px rgba(232, 93, 4, 0.9))",
          }}
        />
      )}
    </svg>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const ROWS_OPTIONS = [8, 12, 16] as const;
const RISK_OPTIONS: PlinkoRisk[] = ["low", "medium", "high"];

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
  const [dropping, setDropping] = useState(false);
  const [result, setResult] = useState<PlinkoResult | null>(null);
  const [history, setHistory] = useState<{ multiplier: number; profit: number }[]>([]);

  // Animation state
  const [ballStep, setBallStep] = useState(-1);
  const [activeBucket, setActiveBucket] = useState<number | null>(null);
  const [animPath, setAnimPath] = useState<Array<"L" | "R"> | null>(null);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => () => { if (animRef.current) clearTimeout(animRef.current); }, []);

  const drop = useCallback(async () => {
    if (betAmount > balance || dropping) return;

    // Clear previous animation
    if (animRef.current) clearTimeout(animRef.current);
    setDropping(true);
    setBallStep(-1);
    setActiveBucket(null);
    setAnimPath(null);
    setResult(null);

    try {
      const res = await fetch("/api/games/plinko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, rows, risk }),
      });
      const data: PlinkoResult = await res.json();
      setResult(data);
      applyProfit(data.profit);
      setHistory((h) => [{ multiplier: data.multiplier, profit: data.profit }, ...h].slice(0, 20));

      // Start animation
      setAnimPath(data.path);
      setBallStep(0);

      let step = 1;
      const tick = () => {
        setBallStep(step);
        if (step < data.path.length) {
          step++;
          animRef.current = setTimeout(tick, STEP_MS);
        } else if (step === data.path.length) {
          // Land in bucket
          step++;
          animRef.current = setTimeout(() => {
            setBallStep(step);
            setActiveBucket(data.bucketIndex);
            setDropping(false);
          }, STEP_MS);
        }
      };
      animRef.current = setTimeout(tick, STEP_MS);
    } catch {
      setDropping(false);
    }
  }, [betAmount, balance, rows, risk, dropping, applyProfit]);

  const table = getMultiplierTable(rows, risk);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <CircleDot className="text-purple-400" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">Plinko</h1>
          <p className="text-xs text-[var(--muted)]">Drop the ball · Watch it bounce · Land on a multiplier</p>
        </div>
      </div>

      {/* Board + controls side by side on large screens */}
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

          {/* Landing result */}
          {result && activeBucket !== null && !dropping && (
            <div
              className={cn(
                "mt-2 text-center text-sm font-black py-1",
                result.profit >= 0 ? "text-[var(--win)]" : "text-[var(--lose)]"
              )}
            >
              {result.multiplier}× &nbsp;
              {result.profit >= 0 ? "+" : ""}${(result.profit / 100).toFixed(2)}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="lg:w-60 space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
            {/* Rows */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)] uppercase tracking-wider">Rows</label>
              <div className="flex gap-1.5">
                {ROWS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRows(r); setBallStep(-1); setActiveBucket(null); }}
                    disabled={dropping}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-sm font-bold transition-all",
                      rows === r
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-[0_0_15px_rgba(232,93,4,0.3)]"
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
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    disabled={dropping}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-xs font-bold capitalize transition-all",
                      risk === r
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-[0_0_15px_rgba(232,93,4,0.3)]"
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
              className={cn(
                "w-full py-3 rounded-xl font-black text-base transition-all",
                "bg-[var(--accent)] text-white hover:opacity-90 active:scale-[0.99]",
                "shadow-[0_0_25px_rgba(232,93,4,0.2)] hover:shadow-[0_0_35px_rgba(232,93,4,0.4)]",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {dropping ? "Dropping…" : "Drop Ball"}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3 space-y-2">
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">History</p>
              <div className="flex flex-wrap gap-1">
                {history.map((h, i) => {
                  const col = multiplierColor(h.multiplier);
                  return (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[10px] font-bold border"
                      style={{ background: col.fill, color: col.text, borderColor: col.stroke }}
                    >
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
      {result && (
        <details className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 text-xs">
          <summary className="cursor-pointer font-semibold text-[var(--text)] hover:text-[var(--accent)]">
            Provably Fair Verification
          </summary>
          <div className="mt-3 space-y-1.5 font-mono break-all text-[var(--muted)]">
            <div><span>Server Seed: </span><span className="text-[var(--text)]">{result.serverSeed}</span></div>
            <div><span>Hash: </span><span className="text-[var(--text)]">{result.serverSeedHash}</span></div>
            <div><span>Client Seed: </span><span className="text-[var(--text)]">{result.clientSeed}</span></div>
            <div><span>Path: </span><span className="text-[var(--text)]">{result.path.join("")}</span></div>
          </div>
        </details>
      )}
    </div>
  );
}
