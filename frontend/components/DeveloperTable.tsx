"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Developer {
  id: string;
  github_username: string;
  display_name?: string;
  avatar_url?: string;
  score?: number;
  tier?: string;
  commits?: number;
  prs_merged?: number;
}

type SortKey = "display_name" | "score" | "tier" | "commits" | "prs_merged";

interface DeveloperTableProps {
  developers: Developer[];
}

const TIER_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Elite:  { bg: "rgba(234,179,8,0.2)",   color: "#fbbf24", border: "rgba(234,179,8,0.3)" },
  Senior: { bg: "rgba(59,130,246,0.2)",  color: "#60a5fa", border: "rgba(59,130,246,0.3)" },
  Mid:    { bg: "rgba(34,197,94,0.2)",   color: "#4ade80", border: "rgba(34,197,94,0.3)" },
  Junior: { bg: "rgba(100,116,139,0.2)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" },
};

const SCORE_COLOR = (score: number): string => {
  if (score >= 70) return "#4ade80";
  if (score >= 50) return "#60a5fa";
  if (score >= 30) return "#fbbf24";
  return "#94a3b8";
};

export default function DeveloperTable({ developers }: DeveloperTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...developers].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  function Th({ label, col }: { label: string; col: SortKey }) {
    const active = sortKey === col;
    return (
      <th
        onClick={() => handleSort(col)}
        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors"
        style={{ color: active ? "#a5b4fc" : "#475569" }}
      >
        {label} {active ? (sortAsc ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Th label="Developer" col="display_name" />
            <Th label="Score" col="score" />
            <Th label="Tier" col="tier" />
            <Th label="Commits" col="commits" />
            <Th label="PRs Merged" col="prs_merged" />
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>
              Profile
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((dev) => {
            const tierStyle = dev.tier ? (TIER_STYLES[dev.tier] ?? TIER_STYLES.Junior) : null;
            return (
              <tr
                key={dev.id}
                className="transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {dev.avatar_url ? (
                      <Image
                        src={dev.avatar_url}
                        alt=""
                        width={36}
                        height={36}
                        className="rounded-full"
                        style={{ outline: "2px solid rgba(99,102,241,0.2)" }}
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
                      >
                        {(dev.display_name || dev.github_username).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                        {dev.display_name || dev.github_username}
                      </p>
                      <p className="text-xs" style={{ color: "#475569" }}>@{dev.github_username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="text-lg font-bold" style={{ color: SCORE_COLOR(dev.score ?? 0) }}>
                    {dev.score?.toFixed(1) ?? "—"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  {dev.tier && tierStyle ? (
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: tierStyle.bg,
                        color: tierStyle.color,
                        border: `1px solid ${tierStyle.border}`,
                      }}
                    >
                      {dev.tier}
                    </span>
                  ) : (
                    <span style={{ color: "#334155" }}>—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold" style={{ color: "#94a3b8" }}>{dev.commits ?? 0}</span>
                    <span className="text-xs" style={{ color: "#475569" }}>commits</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold" style={{ color: "#94a3b8" }}>{dev.prs_merged ?? 0}</span>
                    <span className="text-xs" style={{ color: "#475569" }}>PRs</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Link
                    href={`/developers/${dev.github_username}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: "rgba(99,102,241,0.15)",
                      color: "#a5b4fc",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >
                    View →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
