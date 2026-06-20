"use client";

import Link from "next/link";
import { Flame, Dice5, Grid2x2, CircleDot, Rocket, Disc3, CircleDollarSign, Grid3X3, Gem, TrendingUp, Castle } from "lucide-react";

const GAMES = [
  {
    href: "/games/crash",
    label: "Crash",
    icon: Flame,
    description: "Watch the multiplier climb. Cash out before it crashes.",
    color: "from-orange-600/20 to-red-900/20",
    iconColor: "text-orange-400",
    badge: "Multiplayer",
  },
  {
    href: "/games/dice",
    label: "Dice",
    icon: Dice5,
    description: "Predict whether the roll lands over or under your target.",
    color: "from-blue-600/20 to-indigo-900/20",
    iconColor: "text-blue-400",
    badge: "Classic",
  },
  {
    href: "/games/mines",
    label: "Mines",
    icon: Grid2x2,
    description: "Reveal tiles on a 5×5 grid. Avoid the mines. Cash out any time.",
    color: "from-emerald-600/20 to-green-900/20",
    iconColor: "text-emerald-400",
    badge: "Strategy",
  },
  {
    href: "/games/plinko",
    label: "Plinko",
    icon: CircleDot,
    description: "Drop a ball through a pegged board and hit the multiplier buckets.",
    color: "from-purple-600/20 to-violet-900/20",
    iconColor: "text-purple-400",
    badge: "Luck",
  },
  {
    href: "/games/limbo",
    label: "Limbo",
    icon: Rocket,
    description: "Set a target multiplier and beat it. How high can you go?",
    color: "from-sky-600/20 to-cyan-900/20",
    iconColor: "text-sky-400",
    badge: "Instant",
  },
  {
    href: "/games/wheel",
    label: "Wheel",
    icon: Disc3,
    description: "Spin the wheel, pick your risk, and land on a multiplier.",
    color: "from-rose-600/20 to-pink-900/20",
    iconColor: "text-rose-400",
    badge: "Luck",
  },
  {
    href: "/games/flip",
    label: "Flip",
    icon: CircleDollarSign,
    description: "Call heads or tails and chain a streak for 1.98× each flip.",
    color: "from-amber-600/20 to-yellow-900/20",
    iconColor: "text-amber-400",
    badge: "Instant",
  },
  {
    href: "/games/hilo",
    label: "Hilo",
    icon: TrendingUp,
    description: "Guess higher or lower on each card. Compound your winnings and cash out any time.",
    color: "from-violet-600/20 to-purple-900/20",
    iconColor: "text-violet-400",
    badge: "Strategy",
  },
  {
    href: "/games/dragon-tower",
    label: "Dragon Tower",
    icon: Castle,
    description: "Climb 9 rows, avoid the dragons, and cash out before you get burned.",
    color: "from-orange-600/20 to-amber-900/20",
    iconColor: "text-orange-400",
    badge: "Strategy",
  },
  {
    href: "/games/keno",
    label: "Keno",
    icon: Grid3X3,
    description: "Pick 1–10 tiles from a 40-number grid. Match the draw for big multipliers.",
    color: "from-teal-600/20 to-cyan-900/20",
    iconColor: "text-teal-400",
    badge: "Multi-draw",
  },
  {
    href: "/games/diamonds",
    label: "Diamonds",
    icon: Gem,
    description: "Pick 4 tiles and hunt 3 hidden diamonds. Find all 3 for 18×.",
    color: "from-cyan-600/20 to-sky-900/20",
    iconColor: "text-cyan-400",
    badge: "Reveal",
  },
];

export default function LobbyPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Hero */}
      <div className="pt-4">
        <h1 className="text-3xl font-black text-[var(--text)] tracking-tight">
          Welcome to <span className="text-[var(--accent)]">Steak</span>
        </h1>
        <p className="mt-1 text-[var(--muted)] text-sm">
          Provably fair originals · Play money only · No real wagering
        </p>
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {GAMES.map(({ href, label, icon: Icon, description, color, iconColor, badge }) => (
          <Link
            key={href}
            href={href}
            className={`group relative flex flex-col gap-4 p-6 rounded-2xl bg-gradient-to-br ${color} border border-[var(--border)] hover:border-[var(--accent)] transition-all duration-200 hover:scale-[1.01]`}
          >
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] ${iconColor}`}>
                <Icon size={24} />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-2.5 py-1">
                {badge}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                {label}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">{description}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--accent)] font-semibold mt-auto">
              Play now
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
