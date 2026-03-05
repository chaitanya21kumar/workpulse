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

const TIER_STYLES: Record<string, string> = {
  Elite: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  Senior: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  Mid: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  Junior: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const SCORE_COLOR = (score: number) => {
  if (score >= 70) return "text-emerald-600 font-bold";
  if (score >= 50) return "text-blue-600 font-bold";
  if (score >= 30) return "text-amber-600 font-bold";
  return "text-slate-500 font-bold";
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
      <th onClick={() => handleSort(col)}
        className={`px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors ${
          active ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
        }`}>
        {label} {active ? (sortAsc ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <Th label="Developer" col="display_name" />
            <Th label="Score" col="score" />
            <Th label="Tier" col="tier" />
            <Th label="Commits" col="commits" />
            <Th label="PRs Merged" col="prs_merged" />
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Profile</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {sorted.map((dev, i) => (
            <tr key={dev.id} className={`hover:bg-slate-50/80 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  {dev.avatar_url
                    ? <Image src={dev.avatar_url} alt="" width={36} height={36} className="rounded-full ring-2 ring-slate-200" />
                    : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {(dev.display_name || dev.github_username).charAt(0).toUpperCase()}
                      </div>
                  }
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{dev.display_name || dev.github_username}</p>
                    <p className="text-xs text-slate-400">@{dev.github_username}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className={`text-lg ${SCORE_COLOR(dev.score ?? 0)}`}>{dev.score?.toFixed(1) ?? "—"}</span>
              </td>
              <td className="px-5 py-4">
                {dev.tier
                  ? <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_STYLES[dev.tier] ?? "bg-slate-100 text-slate-600"}`}>{dev.tier}</span>
                  : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">{dev.commits ?? 0}</span>
                  <span className="text-xs text-slate-400">commits</span>
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">{dev.prs_merged ?? 0}</span>
                  <span className="text-xs text-slate-400">PRs</span>
                </div>
              </td>
              <td className="px-5 py-4">
                <Link href={`/developers/${dev.github_username}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition-colors">
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
