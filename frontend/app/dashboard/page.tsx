"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import DeveloperTable from "@/components/DeveloperTable";
import AddDeveloperModal from "@/components/AddDeveloperModal";
import { CardSkeleton, TableSkeleton } from "@/components/LoadingSkeletons";
import AppShell from "@/components/AppShell";

type Period = "7d" | "30d" | "90d";

interface Developer {
  id: string;
  github_username: string;
  display_name?: string;
  score?: number;
  tier?: string;
  commits?: number;
  prs_merged?: number;
  active_days?: number;
  avatar_url?: string;
}

const PERIOD_LABELS: Record<Period, string> = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" };

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const { data: developers, isLoading, isError, refetch } = useQuery<Developer[]>({
    queryKey: ["developers", period],
    queryFn: async () => {
      const res = await api.get(`/api/v1/developers?period=${period}`);
      return res.data;
    },
    enabled: !!user,
  });

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#0b0b14" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl animate-pulse"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
          />
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  const devList = developers ?? [];
  const totalDevelopers = devList.length;
  const avgScore = devList.length > 0
    ? (devList.reduce((s, d) => s + (d.score ?? 0), 0) / devList.length).toFixed(1)
    : "0.0";
  const topPerformer = devList.length > 0
    ? devList.reduce((a, b) => ((a.score ?? 0) > (b.score ?? 0) ? a : b))
    : null;
  const totalCommits = devList.reduce((s, d) => s + (d.commits ?? 0), 0);

  const chartData = [...devList]
    .sort((a, b) => (b.commits ?? 0) - (a.commits ?? 0))
    .slice(0, 10)
    .map((d) => ({
      name: (d.display_name || d.github_username).split(" ")[0],
      commits: d.commits ?? 0,
      prs: d.prs_merged ?? 0,
    }));

  const statCards = [
    { label: "Total Developers", value: totalDevelopers, sub: "tracked", icon: "👥", accent: "#3b82f6", accentEnd: "#6366f1" },
    { label: "Avg Score", value: avgScore, sub: "out of 100", icon: "⭐", accent: "#6366f1", accentEnd: "#8b5cf6" },
    { label: "Top Performer", value: topPerformer?.display_name?.split(" ")[0] || topPerformer?.github_username || "—", sub: topPerformer ? `Score ${topPerformer.score?.toFixed(1)}` : "", icon: "🏆", accent: "#f59e0b", accentEnd: "#f97316" },
    { label: "Total Commits", value: totalCommits, sub: PERIOD_LABELS[period], icon: "📝", accent: "#10b981", accentEnd: "#14b8a6" },
  ];

  return (
    <AppShell>
      <div className="px-8 py-7" style={{ background: "#0b0b14", minHeight: "100%" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Track your team&apos;s GitHub activity and performance</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period toggle - glass style */}
            <div
              className="flex items-center p-1 gap-1 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {(["7d", "30d", "90d"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: period === p ? "rgba(99,102,241,0.8)" : "transparent",
                    color: period === p ? "#fff" : "#64748b",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
            {/* Add Developer button - indigo→violet gradient with glow */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                boxShadow: "0 0 20px rgba(99,102,241,0.4), 0 4px 12px rgba(99,102,241,0.3)",
              }}
            >
              + Add Developer
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {isLoading
            ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
            : statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {/* Top accent gradient stripe */}
                <div
                  className="h-0.5 w-full"
                  style={{
                    background: `linear-gradient(90deg, ${card.accent} 0%, ${card.accentEnd} 100%)`,
                  }}
                />
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className="text-xs font-medium uppercase tracking-wider"
                        style={{ color: "#64748b" }}
                      >
                        {card.label}
                      </p>
                      <p className="text-4xl font-bold text-white mt-1 leading-none">{card.value}</p>
                      {card.sub && (
                        <p className="text-xs mt-1" style={{ color: "#475569" }}>
                          {card.sub}
                        </p>
                      )}
                    </div>
                    <span className="text-2xl opacity-70">{card.icon}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Error */}
        {isError && (
          <div
            className="rounded-xl p-4 mb-5 flex items-center justify-between"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <p className="text-red-400 text-sm font-medium">Failed to load developers.</p>
            <button onClick={() => refetch()} className="text-red-400 text-sm font-semibold underline">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div
            className="xl:col-span-2 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <h2 className="font-bold text-white text-base">Leaderboard</h2>
                <p className="text-slate-400 text-xs mt-0.5">Sorted by contribution score</p>
              </div>
              <span
                className="text-xs font-semibold rounded-lg px-2.5 py-1"
                style={{ color: "#64748b", background: "rgba(255,255,255,0.05)" }}
              >
                {totalDevelopers} devs
              </span>
            </div>
            {isLoading
              ? <table className="min-w-full"><TableSkeleton rows={5} /></table>
              : devList.length === 0
                ? (
                  <div className="py-16 text-center">
                    <p className="text-slate-400">No developers yet.</p>
                    <p className="text-slate-500 text-sm mt-1">Add someone to get started.</p>
                  </div>
                )
                : <DeveloperTable developers={devList} />
            }
          </div>

          {/* Chart */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <h2 className="font-bold text-white text-base mb-1">Commits</h2>
            <p className="text-slate-400 text-xs mb-5">{PERIOD_LABELS[period]}</p>
            {!isLoading && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", color: "#f8fafc", fontSize: 12 }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="commits" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div
                  className="animate-pulse w-full h-48 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No data yet</div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <AddDeveloperModal
          onClose={() => setShowModal(false)}
          onAdded={() => qc.invalidateQueries({ queryKey: ["developers"] })}
        />
      )}
    </AppShell>
  );
}
