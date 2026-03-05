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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 animate-pulse" />
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
    { label: "Total Developers", value: totalDevelopers, sub: "tracked", gradient: "from-blue-500 to-blue-600", icon: "👥" },
    { label: "Avg Score", value: avgScore, sub: "out of 100", gradient: "from-indigo-500 to-indigo-600", icon: "⭐" },
    { label: "Top Performer", value: topPerformer?.display_name?.split(" ")[0] || topPerformer?.github_username || "—", sub: topPerformer ? `Score ${topPerformer.score?.toFixed(1)}` : "", gradient: "from-amber-500 to-orange-500", icon: "🏆" },
    { label: "Total Commits", value: totalCommits, sub: PERIOD_LABELS[period], gradient: "from-emerald-500 to-teal-500", icon: "📝" },
  ];

  return (
    <AppShell>
      <div className="px-8 py-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">Track your team&apos;s GitHub activity and performance</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1">
              {(["7d", "30d", "90d"] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    period === p ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
              + Add Developer
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {isLoading
            ? Array(4).fill(0).map((_, i) => <CardSkeleton key={i} />)
            : statCards.map((card) => (
              <div key={card.label} className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white shadow-lg`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{card.label}</p>
                    <p className="text-3xl font-bold mt-1 leading-none">{card.value}</p>
                    {card.sub && <p className="text-white/60 text-xs mt-1">{card.sub}</p>}
                  </div>
                  <span className="text-2xl opacity-80">{card.icon}</span>
                </div>
              </div>
            ))
          }
        </div>

        {/* Error */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center justify-between">
            <p className="text-red-700 text-sm font-medium">Failed to load developers.</p>
            <button onClick={() => refetch()} className="text-red-600 text-sm font-semibold underline">Retry</button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Leaderboard */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 text-base">Leaderboard</h2>
                <p className="text-slate-400 text-xs mt-0.5">Sorted by contribution score</p>
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">{totalDevelopers} devs</span>
            </div>
            {isLoading
              ? <table className="min-w-full"><TableSkeleton rows={5} /></table>
              : devList.length === 0
                ? <div className="py-16 text-center"><p className="text-slate-400">No developers yet.</p><p className="text-slate-300 text-sm mt-1">Add someone to get started.</p></div>
                : <DeveloperTable developers={devList} />
            }
          </div>

          {/* Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 text-base mb-1">Commits</h2>
            <p className="text-slate-400 text-xs mb-5">{PERIOD_LABELS[period]}</p>
            {!isLoading && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1e293b", border: "none", borderRadius: "12px", color: "#f8fafc", fontSize: 12 }}
                    cursor={{ fill: "#f8fafc" }}
                  />
                  <Bar dataKey="commits" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-pulse w-full h-48 bg-slate-100 rounded-xl" />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-300 text-sm">No data yet</div>
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
