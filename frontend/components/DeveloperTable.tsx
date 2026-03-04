"use client";

import { useState } from "react";
import Link from "next/link";

interface Developer {
  id: string;
  github_username: string;
  display_name?: string;
  score?: number;
  tier?: string;
  commits?: number;
  prs_merged?: number;
}

type SortKey = "display_name" | "score" | "tier" | "commits" | "prs_merged";

interface DeveloperTableProps {
  developers: Developer[];
}

const TIER_COLORS: Record<string, string> = {
  Elite: "bg-yellow-100 text-yellow-800",
  Senior: "bg-blue-100 text-blue-800",
  Mid: "bg-green-100 text-green-800",
  Junior: "bg-gray-100 text-gray-800",
};

export default function DeveloperTable({ developers }: DeveloperTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...developers].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av < bv) return sortAsc ? -1 : 1;
    if (av > bv) return sortAsc ? 1 : -1;
    return 0;
  });

  function SortHeader({ label, col }: { label: string; col: SortKey }) {
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:text-gray-700 select-none"
        onClick={() => handleSort(col)}
      >
        {label} {sortKey === col ? (sortAsc ? "▲" : "▼") : ""}
      </th>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <SortHeader label="Name" col="display_name" />
            <SortHeader label="Score" col="score" />
            <SortHeader label="Tier" col="tier" />
            <SortHeader label="Commits" col="commits" />
            <SortHeader label="PRs" col="prs_merged" />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sorted.map((dev) => (
            <tr key={dev.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/developers/${dev.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {dev.display_name || dev.github_username}
                </Link>
              </td>
              <td className="px-4 py-3 font-semibold">{dev.score?.toFixed(1) ?? "—"}</td>
              <td className="px-4 py-3">
                {dev.tier ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${TIER_COLORS[dev.tier] ?? "bg-gray-100 text-gray-800"}`}>
                    {dev.tier}
                  </span>
                ) : "—"}
              </td>
              <td className="px-4 py-3">{dev.commits ?? 0}</td>
              <td className="px-4 py-3">{dev.prs_merged ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
