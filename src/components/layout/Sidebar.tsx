"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Dice5, Grid2x2, CircleDot, Rocket, Disc3, CircleDollarSign, Grid3X3, Gem, Zap, Home } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Lobby", icon: Home },
  { href: "/games/crash", label: "Crash", icon: Flame },
  { href: "/games/dice", label: "Dice", icon: Dice5 },
  { href: "/games/mines", label: "Mines", icon: Grid2x2 },
  { href: "/games/plinko", label: "Plinko", icon: CircleDot },
  { href: "/games/limbo", label: "Limbo", icon: Rocket },
  { href: "/games/wheel", label: "Wheel", icon: Disc3 },
  { href: "/games/flip", label: "Flip", icon: CircleDollarSign },
  { href: "/games/keno", label: "Keno", icon: Grid3X3 },
  { href: "/games/diamonds", label: "Diamonds", icon: Gem },
];

export function Sidebar() {
  const path = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 bg-[var(--surface)] border-r border-[var(--border)] h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--border)]">
        <Zap className="text-[var(--accent)] fill-[var(--accent)]" size={22} />
        <span className="text-xl font-black tracking-tight text-[var(--text)]">
          STEAK
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">
          Games
        </p>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              path === href
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            )}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--muted)] text-center">
          Play money only · No real wagering
        </p>
      </div>
    </aside>
  );
}
