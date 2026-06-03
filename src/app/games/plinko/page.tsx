"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { CircleDot } from "lucide-react";
import { BetInput } from "@/components/ui/BetInput";
import { useBalance } from "@/context/BalanceContext";
import { getMultiplierTable } from "@/lib/game-engine/plinko";
import { cn } from "@/lib/cn";
import type { PlinkoRisk } from "@/lib/game-engine/plinko";

// ─── Board geometry ───────────────────────────────────────────────────────────

const W = 420;
const H = 500;
const PAD = 18;
const TOP_Y = 40;
const BUCKET_H = 50;
const PEG_AREA_H = H - TOP_Y - BUCKET_H;

/** Spacing between pegs (= bucket width). (rows+1) buckets across (W-2*PAD). */
const spacing = (rows: number) => (W - 2 * PAD) / (rows + 1);
const rowH    = (rows: number) => PEG_AREA_H / rows;

const CX = W / 2;

const pegX = (r: number, j: number, rows: number) =>
  CX + (j - r / 2) * spacing(rows);
const pegY = (r: number, rows: number) => TOP_Y + r * rowH(rows);
const bucketCX = (j: number, rows: number) =>
  PAD + (j + 0.5) * spacing(rows);
const bucketY = (rows: number) => TOP_Y + rows * rowH(rows) + 8;

// ─── Physics constants ────────────────────────────────────────────────────────

const GRAVITY   = 0.045;  // px / frame²
const BOUNCE_VY = -0.8;   // upward kick on peg hit — gives ~7px visible arc at this gravity
const BALL_R    = 5;

/** Horizontal speed after deflection — calibrated so ball travels ~1 column per row at GRAVITY=0.045. */
const deflectVX = (rows: number) => spacing(rows) * 0.014;

// ─── Ball physics state ───────────────────────────────────────────────────────

interface PhysBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  path: Array<"L" | "R">;
  bucketIndex: number;
  nextPeg: number;   // index of the next peg row to hit (0..rows)
  rCount: number;    // R-moves taken so far
  landed: boolean;
}

// ─── Multiplier colour helpers ────────────────────────────────────────────────

function mFill(m: number): string {
  if (m >= 50)  return "rgba(232,93,4,0.95)";
  if (m >= 10)  return "rgba(232,93,4,0.55)";
  if (m >= 3)   return "rgba(244,140,6,0.35)";
  if (m >= 1.5) return "rgba(255,255,255,0.07)";
  if (m >= 1)   return "rgba(255,255,255,0.04)";
  return               "rgba(239,68,68,0.25)";
}
function mText(m: number): string {
  if (m >= 10)  return "#e85d04";
  if (m >= 3)   return "#f48c06";
  if (m >= 1.5) return "#c9d3dd";
  if (m >= 1)   return "#5a4a32";
  return               "#ef4444";
}
function mStroke(m: number): string {
  if (m >= 10)  return "rgba(232,93,4,0.7)";
  if (m >= 3)   return "rgba(244,140,6,0.5)";
  if (m >= 1.5) return "rgba(255,255,255,0.14)";
  if (m >= 1)   return "rgba(255,255,255,0.07)";
  return               "rgba(239,68,68,0.45)";
}

// ─── Canvas Plinko Board ──────────────────────────────────────────────────────

function PlinkoBoard({
  rows,
  risk,
  ballsRef,
  running,
  onAllLanded,
}: {
  rows: 8 | 12 | 16;
  risk: PlinkoRisk;
  ballsRef: React.MutableRefObject<PhysBall[]>;
  running: boolean;
  onAllLanded: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const table     = getMultiplierTable(rows, risk);
  const sp        = spacing(rows);
  const rh        = rowH(rows);
  const pr        = Math.max(3, 4.5 - (rows - 8) * 0.12); // peg radius
  const dpr       = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const dvx       = deflectVX(rows);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale canvas for retina
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    const bY  = bucketY(rows);
    const bH  = BUCKET_H - 16;
    const bW  = sp - 3;
    const fs  = Math.max(7, Math.min(11, sp * 0.52));

    const drawPegsAndBuckets = (landCount: Record<number, number> = {}) => {
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      for (let r = 0; r < rows; r++) {
        for (let j = 0; j <= r; j++) {
          ctx.beginPath();
          ctx.arc(pegX(r, j, rows), pegY(r, rows), pr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = 0; i <= rows; i++) {
        const m   = table[i];
        const cx  = bucketCX(i, rows);
        const hit = landCount[i] ?? 0;
        const x   = cx - bW / 2;
        ctx.fillStyle = mFill(m);
        ctx.strokeStyle = mStroke(m);
        ctx.lineWidth = hit > 0 ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(x, bY, bW, bH, 3);
        ctx.fill();
        ctx.stroke();
        if (hit > 0) {
          ctx.fillStyle = `rgba(255,255,255,${Math.min(0.22, hit * 0.07)})`;
          ctx.beginPath();
          ctx.roundRect(x, bY, bW, bH, 3);
          ctx.fill();
        }
        ctx.fillStyle = mText(m);
        ctx.font = `700 ${fs}px system-ui,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${m}×`, cx, bY + bH / 2);
      }
    };

    // Always draw the static board immediately (pegs + buckets)
    ctx.clearRect(0, 0, W, H);
    drawPegsAndBuckets();

    if (!running) return;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Count landed balls per bucket
      const landCount: Record<number, number> = {};
      for (const b of ballsRef.current) {
        if (b.landed) landCount[b.bucketIndex] = (landCount[b.bucketIndex] ?? 0) + 1;
      }

      drawPegsAndBuckets(landCount);

      // ── Update + draw balls ──
      let allDone = true;
      for (const ball of ballsRef.current) {
        if (!ball.landed) {
          // Physics step
          ball.vy += GRAVITY;
          ball.x  += ball.vx;
          ball.y  += ball.vy;

          // Peg collision — may pass through multiple peg rows in one frame
          while (ball.nextPeg < rows && ball.y >= pegY(ball.nextPeg, rows)) {
            const dir = ball.path[ball.nextPeg];
            ball.vx = dvx * (dir === "R" ? 1 : -1);
            ball.vy = BOUNCE_VY;
            if (dir === "R") ball.rCount++;
            ball.nextPeg++;
          }

          // Past all pegs: spring toward target bucket and dampen lateral drift
          if (ball.nextPeg >= rows) {
            const targetX = bucketCX(ball.rCount, rows);
            ball.vx += (targetX - ball.x) * 0.08;
            ball.vx *= 0.82;
          }

          // Settle into bucket once past all pegs and below bucket line
          if (ball.nextPeg >= rows && ball.y >= bY + bH * 0.5) {
            ball.landed = true;
            ball.x = bucketCX(ball.rCount, rows);
            ball.y = bY + bH * 0.5;
          }

          allDone = false;
        }

        // Draw
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = ball.landed ? "rgba(244,140,6,0.6)" : "#e85d04";
        ctx.shadowColor = ball.landed ? "transparent" : "rgba(232,93,4,0.35)";
        ctx.shadowBlur  = ball.landed ? 0 : 5;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (allDone && ballsRef.current.length > 0) {
        cancelAnimationFrame(rafRef.current);
        onAllLanded();
        return;
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, rows, risk]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: W, height: H, maxWidth: "100%", display: "block", margin: "0 auto" }}
    />
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
  const [betAmount, setBetAmount]   = useState(100_00);
  const [rows, setRows]             = useState<8 | 12 | 16>(8);
  const [risk, setRisk]             = useState<PlinkoRisk>("medium");
  const [ballCount, setBallCount]   = useState<1 | 3 | 5 | 10 | 25 | 100>(1);
  const [dropping, setDropping]     = useState(false);
  const [sessionProfit, setSessionProfit] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<PlinkoResult | null>(null);
  const [history, setHistory]       = useState<{ multiplier: number; profit: number }[]>([]);

  const ballsRef       = useRef<PhysBall[]>([]);
  const totalProfitRef = useRef(0);

  const handleAllLanded = useCallback(() => {
    setDropping(false);
    setSessionProfit(totalProfitRef.current);
  }, []);

  const drop = useCallback(async () => {
    if (betAmount * ballCount > balance || dropping) return;

    setDropping(true);
    setSessionProfit(null);
    setLastResult(null);
    ballsRef.current = [];

    try {
      const res = await fetch("/api/games/plinko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ betAmount, rows, risk, count: ballCount }),
      });
      const raw = await res.json();
      const results: PlinkoResult[] = ballCount === 1 ? [raw] : raw;

      // Apply profit immediately (server already resolved)
      let total = 0;
      results.forEach(r => {
        total += r.profit;
        applyProfit(r.profit);
        setHistory(h => [{ multiplier: r.multiplier, profit: r.profit }, ...h].slice(0, 40));
      });
      totalProfitRef.current = total;
      setLastResult(results[results.length - 1]);

      // Init physics balls — all start at top center
      ballsRef.current = results.map(r => ({
        x: CX + (Math.random() - 0.5) * 2, // tiny ±1px jitter so they don't overlap perfectly
        y: TOP_Y - rowH(rows) * 0.8,
        vx: 0,
        vy: 0,
        path: r.path,
        bucketIndex: r.bucketIndex,
        nextPeg: 0,
        rCount: 0,
        landed: false,
      }));

    } catch {
      setDropping(false);
    }
  }, [betAmount, ballCount, balance, rows, risk, dropping, applyProfit]);

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
          <p className="text-xs text-[var(--muted)]">Drop balls · Physics simulation · Land on a multiplier</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Board */}
        <div className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-2 overflow-hidden">
          <PlinkoBoard
            rows={rows}
            risk={risk}
            ballsRef={ballsRef}
            running={dropping}
            onAllLanded={handleAllLanded}
          />

          <div className="min-h-[24px] text-center py-1">
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
                    onClick={() => { setRows(r); ballsRef.current = []; }}
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
                        ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-[0_0_14px_rgba(232,93,4,0.3)]"
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
                {history.map((h, i) => (
                  <span key={i}
                    className="px-2 py-0.5 rounded text-[10px] font-bold border"
                    style={{ background: mFill(h.multiplier), color: mText(h.multiplier), borderColor: mStroke(h.multiplier) }}
                  >
                    {h.multiplier}×
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Provably fair */}
      {lastResult && (
        <details className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 text-xs">
          <summary className="cursor-pointer font-semibold text-[var(--text)] hover:text-[var(--accent)]">
            Provably Fair {ballCount > 1 ? "— Last Ball" : "Verification"}
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
