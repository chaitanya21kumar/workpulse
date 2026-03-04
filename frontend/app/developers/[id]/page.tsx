"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import Image from "next/image";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import MetricCard from "@/components/MetricCard";
import InsightPanel from "@/components/InsightPanel";
import ScoreRing from "@/components/ScoreRing";
import { CardSkeleton } from "@/components/LoadingSkeletons";
import Link from "next/link";

const TIER_COLORS: Record<string, string> = {
  Elite: "bg-yellow-100 text-yellow-800",
  Senior: "bg-blue-100 text-blue-800",
  Mid: "bg-green-100 text-green-800",
  Junior: "bg-gray-100 text-gray-800",
};

interface Developer {
  id: string;
  github_username: string;
  display_name?: string;
  avatar_url?: string;
  score?: number;
  tier?: string;
  commits?: number;
  prs_merged?: number;
  reviews_given?: number;
  issues_closed?: number;
  lines_changed?: number;
  active_days?: number;
  insights?: {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
    action_items?: string[];
    team_impact?: string;
    predicted_trend?: string;
  };
}

export default function DeveloperProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();

  const {
    data: developer,
    isLoading,
    isError,
    refetch,
  } = useQuery<Developer>({
    queryKey: ["developer", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/developers/${id}`);
      return res.data;
    },
    enabled: !!user && !!id,
  });

  const { mutate: refreshInsights, isPending: refreshing } = useMutation({
    mutationFn: async () => {
      await api.post(`/api/v1/insights/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["developer", id] });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-red-700">Failed to load developer profile.</p>
          <button onClick={() => refetch()} className="text-red-700 underline text-sm">Retry</button>
        </div>
      </div>
    );
  }

  if (!developer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-400 text-center">Developer not found.</p>
      </div>
    );
  }

  const radarData = [
    { metric: "Commits", value: Math.min((developer.commits ?? 0) / 2, 100) },
    { metric: "PRs", value: Math.min((developer.prs_merged ?? 0) * 5, 100) },
    { metric: "Reviews", value: Math.min((developer.reviews_given ?? 0) * 4, 100) },
    { metric: "Issues", value: Math.min((developer.issues_closed ?? 0) * 5, 100) },
    { metric: "Active Days", value: Math.min((developer.active_days ?? 0) * 3, 100) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Dashboard
        </Link>
      </div>

      {/* Developer Header */}
      <div className="bg-white rounded-lg shadow p-6 flex items-center gap-6">
        {developer.avatar_url ? (
          <Image
            src={developer.avatar_url}
            alt={developer.display_name || developer.github_username}
            width={72}
            height={72}
            className="rounded-full"
          />
        ) : (
          <div className="w-18 h-18 rounded-full bg-gray-200 flex items-center justify-center text-2xl text-gray-500">
            {(developer.display_name || developer.github_username).charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {developer.display_name || developer.github_username}
          </h1>
          <p className="text-gray-500 text-sm">@{developer.github_username}</p>
          {developer.tier && (
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[developer.tier] ?? "bg-gray-100 text-gray-800"}`}>
              {developer.tier}
            </span>
          )}
        </div>
        {developer.score != null && (
          <ScoreRing score={developer.score} tier={developer.tier ?? "Junior"} size={80} />
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <MetricCard name="Commits" value={developer.commits ?? 0} icon="📝" />
        <MetricCard name="PRs Merged" value={developer.prs_merged ?? 0} icon="🔀" />
        <MetricCard name="Reviews Given" value={developer.reviews_given ?? 0} icon="👀" />
        <MetricCard name="Issues Closed" value={developer.issues_closed ?? 0} icon="✅" />
        <MetricCard name="Lines Changed" value={(developer.lines_changed ?? 0).toLocaleString()} icon="📊" />
        <MetricCard name="Active Days" value={developer.active_days ?? 0} icon="📅" />
      </div>

      {/* Radar Chart */}
      <div className="bg-white rounded-lg shadow p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Metric Breakdown</h2>
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <Radar
              name="Developer"
              dataKey="value"
              fill="#3B82F6"
              fillOpacity={0.4}
              stroke="#3B82F6"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">AI Insights</h2>
          <button
            onClick={() => refreshInsights()}
            disabled={refreshing}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh Insights"}
          </button>
        </div>
        <InsightPanel insights={developer.insights ?? {}} />
      </div>
    </div>
  );
}
