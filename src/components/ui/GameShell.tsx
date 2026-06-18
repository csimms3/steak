"use client";

import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface ProvablyFair {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce?: number;
  extra?: { label: string; value: string }[];
}

interface GameShellProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon tile, e.g. "bg-purple-500/10 border-purple-500/20 text-purple-400". */
  iconClass?: string;
  fair?: ProvablyFair | null;
  children: ReactNode;
}

export function GameShell({
  title,
  subtitle,
  icon: Icon,
  iconClass = "bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)]",
  fair,
  children,
}: GameShellProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg border ${iconClass}`}>
          <Icon size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">{title}</h1>
          <p className="text-xs text-[var(--muted)]">{subtitle}</p>
        </div>
      </div>

      {children}

      {fair && (
        <details className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 text-xs">
          <summary className="cursor-pointer font-semibold text-[var(--text)] hover:text-[var(--accent)]">
            Provably Fair Verification
          </summary>
          <div className="mt-3 space-y-1.5 font-mono break-all text-[var(--muted)]">
            <div>Server Seed: <span className="text-[var(--text)]">{fair.serverSeed}</span></div>
            <div>Hash: <span className="text-[var(--text)]">{fair.serverSeedHash}</span></div>
            <div>Client Seed: <span className="text-[var(--text)]">{fair.clientSeed}</span></div>
            {fair.nonce !== undefined && (
              <div>Nonce: <span className="text-[var(--text)]">{fair.nonce}</span></div>
            )}
            {fair.extra?.map((e) => (
              <div key={e.label}>{e.label}: <span className="text-[var(--text)]">{e.value}</span></div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
