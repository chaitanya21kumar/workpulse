"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import DeveloperTable from "@/components/DeveloperTable";
import AddDeveloperModal from "@/components/AddDeveloperModal";
import { CardSkeleton, TableSkeleton } from "@/components/LoadingSkeletons";

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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();
  const router = useRouter();

  const {
    data: developers,
    isLoading,
    isError,
    refetch,
  } = useQuery<Developer[]>({
    queryKey: ["developers", period],
    queryFn: async () => {
      const res = await api.get(`/api/v1/developers?period=${period}`);
      return res.data;
    },
    enabled: !!user,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const devList = developers ?? [];

  const totalDevelopers = devList.length;
  const avgScore =
    devList.length > 0
      ? (devList.reduce((s, d) => s + (d.score ?? 0), 0) / devList.length).toFixed(1)
      : "0.0";
  const topPerformer =
    devList.length > 0
      ? devList.reduce((a, b) => ((a.score ?? 0) > (b.score ?? 0) ? a : b))
          .display_name || devList[0]?.github_username
      : "—";
  const activeThisWeek = devList.filter((d) => (d.active_days ?? 0) > 0).length;

  const chartData = devList.map((d) => ({
    name: d.display_name || d.github_username,
    commits: d.commits ?? 0,
  }));

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">WorkPulse Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Add Developer
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 border text-gray-600 rounded-lg hover:bg-gray-50 text-sm"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">Total Developers</p>
              <p className="text-3xl font-bold text-gray-900">{totalDevelopers}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">Avg Score</p>
              <p className="text-3xl font-bold text-blue-600">{avgScore}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">Top Performer</p>
              <p className="text-xl font-bold text-yellow-600 truncate">{topPerformer}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-5">
              <p className="text-sm text-gray-500">Active This Week</p>
              <p className="text-3xl font-bold text-green-600">{activeThisWeek}</p>
            </div>
          </>
        )}
      </div>

      {/* Period Toggle */}
      <div className="flex gap-2 mb-4">
        {(["7d", "30d", "90d"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              period === p
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <p className="text-red-700 text-sm">Failed to load developers.</p>
          <button
            onClick={() => refetch()}
            className="text-red-700 underline text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Developer Table */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-800">Developer Leaderboard</h2>
        </div>
        {isLoading ? (
          <table className="min-w-full">
            <TableSkeleton rows={5} />
          </table>
        ) : devList.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No developers yet. Add one to get started.
          </div>
        ) : (
          <DeveloperTable developers={devList} />
        )}
      </div>

      {/* Bar Chart */}
      {!isLoading && chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Commits per Developer</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="commits" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showModal && (
        <AddDeveloperModal
          onClose={() => setShowModal(false)}
          onAdded={() => qc.invalidateQueries({ queryKey: ["developers"] })}
        />
      )}
    </div>
  );
}
