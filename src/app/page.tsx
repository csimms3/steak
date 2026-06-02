"use client";

import Link from "next/link";
import { Flame, Dice5, Grid2x2, CircleDot } from "lucide-react";

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
