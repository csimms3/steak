"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Flame, Dice5, Grid2x2, CircleDot, Rocket, Disc3, CircleDollarSign,
  Grid3X3, Gem, TrendingUp, Castle, Spade, LayoutGrid, Search, Zap, Club,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Group = "originals" | "tables";

interface Game {
  href: string;
  label: string;
  icon: typeof Flame;
  description: string;
  poster: string; // gradient classes for the poster card
  badge: string;
  group: Group;
  trend?: number; // rank in the trending row
}

const GAMES: Game[] = [
  { href: "/games/crash", label: "Crash", icon: Flame, badge: "Multiplayer", group: "originals", trend: 1,
    description: "Watch the multiplier climb. Cash out before it crashes.", poster: "from-orange-500 to-rose-700" },
  { href: "/games/mines", label: "Mines", icon: Grid2x2, badge: "Strategy", group: "originals", trend: 2,
    description: "Reveal tiles on a 5×5 grid. Avoid the mines. Cash out any time.", poster: "from-emerald-500 to-teal-800" },
  { href: "/games/plinko", label: "Plinko", icon: CircleDot, badge: "Luck", group: "originals", trend: 3,
    description: "Drop a ball through a pegged board and hit the multiplier buckets.", poster: "from-fuchsia-500 to-purple-800" },
  { href: "/games/dice", label: "Dice", icon: Dice5, badge: "Classic", group: "originals", trend: 4,
    description: "Predict whether the roll lands over or under your target.", poster: "from-blue-500 to-indigo-800" },
  { href: "/games/blackjack", label: "Blackjack", icon: Spade, badge: "Classic", group: "tables", trend: 5,
    description: "Hit, stand, double, or split. Beat the dealer to 21 for a 3:2 payout.", poster: "from-slate-600 to-slate-900" },
  { href: "/games/limbo", label: "Limbo", icon: Rocket, badge: "Instant", group: "originals", trend: 6,
    description: "Set a target multiplier and beat it. How high can you go?", poster: "from-sky-400 to-blue-700" },
  { href: "/games/dragon-tower", label: "Dragon Tower", icon: Castle, badge: "Strategy", group: "originals", trend: 7,
    description: "Climb 9 rows, avoid the dragons, and cash out before you get burned.", poster: "from-red-500 to-orange-900" },
  { href: "/games/keno", label: "Keno", icon: Grid3X3, badge: "Multi-draw", group: "originals", trend: 8,
    description: "Pick 1–10 tiles from a 40-number grid. Match the draw for big multipliers.", poster: "from-teal-400 to-cyan-800" },
  { href: "/games/wheel", label: "Wheel", icon: Disc3, badge: "Luck", group: "originals",
    description: "Spin the wheel, pick your risk, and land on a multiplier.", poster: "from-rose-500 to-pink-800" },
  { href: "/games/flip", label: "Flip", icon: CircleDollarSign, badge: "Instant", group: "originals",
    description: "Call heads or tails and chain a streak for 1.98× each flip.", poster: "from-amber-400 to-orange-700" },
  { href: "/games/diamonds", label: "Diamonds", icon: Gem, badge: "Reveal", group: "originals",
    description: "Pick 4 tiles and hunt 3 hidden diamonds. Find all 3 for 18×.", poster: "from-cyan-400 to-sky-700" },
  { href: "/games/hilo", label: "Hilo", icon: TrendingUp, badge: "Strategy", group: "tables",
    description: "Guess higher or lower on each card. Compound your winnings and cash out any time.", poster: "from-violet-500 to-purple-900" },
  { href: "/games/video-poker", label: "Video Poker", icon: LayoutGrid, badge: "Classic", group: "tables",
    description: "Jacks or Better — hold your best cards and draw for the payout.", poster: "from-indigo-500 to-blue-900" },
];

// ─── Fake live-play counts ─────────────────────────────────────────────────────
// Deterministic base (SSR-safe), gentle wobble after mount so the lobby feels alive.

function hashLabel(label: string): number {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function liveCount(label: string, tick: number): number {
  const h = hashLabel(label);
  const base = 140 + (h % 820);
  if (tick === 0) return base;
  return Math.max(8, Math.round(base + Math.sin((h % 97) + tick * 1.7) * 17));
}

function PlayingCount({ label, tick }: { label: string; tick: number }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] tabular-nums">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--live)] animate-pulse" />
      <span className="text-[var(--text)] font-semibold">{liveCount(label, tick).toLocaleString()}</span>
      playing
    </span>
  );
}

// ─── Poster card ───────────────────────────────────────────────────────────────

function PosterCard({ game, tick, rank, className }: { game: Game; tick: number; rank?: number; className?: string }) {
  const Icon = game.icon;
  return (
    <Link href={game.href} title={game.description} className={cn("group block", className)}>
      <div className={cn(
        "relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-b border border-white/10",
        "transition-transform duration-200 group-hover:-translate-y-1.5",
        game.poster,
      )}>
        {/* sheen */}
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
        {/* provider mark */}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 font-display text-[9px] font-bold tracking-[0.25em] text-white/60 uppercase">
          Steak
        </span>
        {rank !== undefined && (
          <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white">
            {rank}
          </span>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-3">
          <Icon size={42} className="text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]" strokeWidth={1.75} />
          <span className="font-display text-white text-sm md:text-[15px] font-extrabold uppercase tracking-wider text-center leading-tight drop-shadow">
            {game.label}
          </span>
        </div>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-semibold uppercase tracking-widest text-white/55">
          {game.badge}
        </span>
      </div>
      <div className="flex justify-center mt-2">
        <PlayingCount label={game.label} tick={tick} />
      </div>
    </Link>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Flame; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={18} className="text-[var(--accent-2)]" />
      <h2 className="font-display text-lg font-bold text-[var(--text)]">{title}</h2>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LobbyPage() {
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 4000);
    return () => clearInterval(id);
  }, []);

  const trending = useMemo(
    () => GAMES.filter((g) => g.trend !== undefined).sort((a, b) => a.trend! - b.trend!),
    []
  );
  const originals = GAMES.filter((g) => g.group === "originals");
  const tables = GAMES.filter((g) => g.group === "tables");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return GAMES.filter((g) => g.label.toLowerCase().includes(q) || g.badge.toLowerCase().includes(q));
  }, [query]);

  const totalPlaying = GAMES.reduce((sum, g) => sum + liveCount(g.label, tick), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(90%_120%_at_85%_-20%,rgba(139,92,246,0.22),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_100%_at_0%_110%,rgba(34,211,238,0.10),transparent_55%)]" />
        <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-[var(--text)] tracking-tight leading-tight">
              The world&apos;s most <span className="text-[var(--accent-2)]">sizzling</span> play-money casino
            </h1>
            <p className="mt-2.5 text-sm text-[var(--muted)]">
              Provably fair originals · Play money only · No real wagering
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Link
                href="/games/crash"
                className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all"
              >
                Play now
              </Link>
              <span className="flex items-center gap-1.5 text-xs text-[var(--muted)] tabular-nums">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--live)] animate-pulse" />
                <span className="text-[var(--text)] font-semibold">{totalPlaying.toLocaleString()}</span>
                playing now
              </span>
            </div>
          </div>
          {/* Promo tiles */}
          <div className="hidden md:grid grid-cols-2 gap-3">
            <a href="#originals" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-500 to-purple-900 border border-white/10 p-4 h-32 flex flex-col justify-between transition-transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
              <Zap size={24} className="relative text-white" />
              <span className="relative font-display text-white font-extrabold text-sm uppercase tracking-wider">Originals</span>
            </a>
            <a href="#tables" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 to-blue-900 border border-white/10 p-4 h-32 flex flex-col justify-between transition-transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,255,255,0.18),transparent_55%)]" />
              <Club size={24} className="relative text-white" />
              <span className="relative font-display text-white font-extrabold text-sm uppercase tracking-wider">Cards &amp; Tables</span>
            </a>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl pl-11 pr-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {results ? (
        <section className="space-y-4">
          <SectionHeader icon={Search} title={results.length ? `Results (${results.length})` : "No games found"} />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {results.map((g) => <PosterCard key={g.href} game={g} tick={tick} />)}
          </div>
        </section>
      ) : (
        <>
          {/* Trending */}
          <section className="space-y-4">
            <SectionHeader icon={TrendingUp} title="Trending" />
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {trending.map((g, i) => (
                <PosterCard key={g.href} game={g} tick={tick} rank={i + 1} className="shrink-0 w-32 md:w-36 snap-start" />
              ))}
            </div>
          </section>

          {/* Originals */}
          <section id="originals" className="space-y-4 scroll-mt-20">
            <SectionHeader icon={Zap} title="Steak Originals" />
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {originals.map((g) => <PosterCard key={g.href} game={g} tick={tick} />)}
            </div>
          </section>

          {/* Tables */}
          <section id="tables" className="space-y-4 scroll-mt-20">
            <SectionHeader icon={Club} title="Cards & Tables" />
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {tables.map((g) => <PosterCard key={g.href} game={g} tick={tick} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
