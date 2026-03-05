"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import Image from "next/image";
import Link from "next/link";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import MetricCard from "@/components/MetricCard";
import InsightPanel from "@/components/InsightPanel";
import ScoreRing from "@/components/ScoreRing";
import AppShell from "@/components/AppShell";

const TIER_STYLES: Record<string, string> = {
  Elite: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  Senior: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  Mid: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  Junior: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#FA7343",
  Kotlin: "#7F52FF",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
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

interface GitHubRepo {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

export default function DeveloperProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const { data: developer, isLoading, isError, refetch } = useQuery<Developer>({
    queryKey: ["developer", id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/developers/${id}`);
      return res.data;
    },
    enabled: !!user && !!id,
  });

  // Fetch top repos from GitHub public API — no auth needed
  const { data: githubRepos } = useQuery<GitHubRepo[]>({
    queryKey: ["github-repos", id],
    queryFn: async () => {
      const res = await fetch(
        `https://api.github.com/users/${id}/repos?sort=stars&per_page=10&type=public`
      );
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const topRepos = useMemo(() => {
    if (!githubRepos) return [];
    return [...githubRepos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5);
  }, [githubRepos]);

  const languageBreakdown = useMemo(() => {
    if (!githubRepos || githubRepos.length === 0) return [];
    const counts: Record<string, number> = {};
    githubRepos.forEach((repo) => {
      if (repo.language) counts[repo.language] = (counts[repo.language] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .map(([lang, count]) => ({ lang, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [githubRepos]);

  const { mutate: refreshInsights, isPending: refreshing } = useMutation({
    mutationFn: async () => { await api.post(`/api/v1/insights/${id}`); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["developer", id] }),
  });

  if (authLoading || !user || isLoading) {
    return (
      <AppShell>
        <div className="px-8 py-7">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-200 p-5 h-28" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell>
        <div className="px-8 py-7">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-red-800 font-semibold">Failed to load developer profile</p>
              <p className="text-red-600 text-sm mt-1">The developer may not exist or the connection failed.</p>
            </div>
            <button onClick={() => refetch()} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Retry</button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!developer) {
    return (
      <AppShell>
        <div className="px-8 py-7 text-center">
          <p className="text-slate-400">Developer not found.</p>
          <Link href="/dashboard" className="text-indigo-600 text-sm mt-2 inline-block hover:underline">← Back to Dashboard</Link>
        </div>
      </AppShell>
    );
  }

  // Guard against undefined display_name / github_username before calling charAt
  const initial = (developer.display_name || developer.github_username || "?")
    .charAt(0)
    .toUpperCase();

  const metrics = [
    { name: "Commits", value: developer.commits ?? 0, icon: "📝", accent: "indigo" },
    { name: "PRs Merged", value: developer.prs_merged ?? 0, icon: "🔀", accent: "blue" },
    { name: "Reviews Given", value: developer.reviews_given ?? 0, icon: "👀", accent: "purple" },
    { name: "Issues Closed", value: developer.issues_closed ?? 0, icon: "✅", accent: "emerald" },
    { name: "Lines Changed", value: (developer.lines_changed ?? 0).toLocaleString(), icon: "📊", accent: "amber" },
    { name: "Active Days", value: developer.active_days ?? 0, icon: "📅", accent: "rose" },
  ];

  const radarData = [
    { metric: "Commits", value: Math.min((developer.commits ?? 0) / 2, 100) },
    { metric: "PRs", value: Math.min((developer.prs_merged ?? 0) * 5, 100) },
    { metric: "Reviews", value: Math.min((developer.reviews_given ?? 0) * 4, 100) },
    { metric: "Issues", value: Math.min((developer.issues_closed ?? 0) * 5, 100) },
    { metric: "Activity", value: Math.min((developer.active_days ?? 0) * 3, 100) },
  ];

  return (
    <AppShell>
      <div className="px-8 py-7 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-slate-400 hover:text-indigo-600 transition-colors">Dashboard</Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 font-medium">{developer.display_name || developer.github_username}</span>
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-600" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10">
              <div className="flex items-end gap-4">
                {developer.avatar_url
                  ? <Image src={developer.avatar_url} alt={developer.display_name || developer.github_username || ""} width={80} height={80}
                      className="rounded-2xl ring-4 ring-white shadow-lg" />
                  : <div className="w-20 h-20 rounded-2xl ring-4 ring-white bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {initial}
                    </div>
                }
                <div className="pb-1">
                  <h1 className="text-xl font-bold text-slate-900">{developer.display_name || developer.github_username}</h1>
                  <p className="text-slate-400 text-sm">@{developer.github_username}</p>
                  {developer.tier && (
                    <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_STYLES[developer.tier] ?? "bg-slate-100 text-slate-600"}`}>
                      {developer.tier}
                    </span>
                  )}
                </div>
              </div>
              {developer.score != null && <ScoreRing score={developer.score} tier={developer.tier ?? "Junior"} size={80} />}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((m) => (
            <MetricCard key={m.name} name={m.name} value={m.value} icon={m.icon} accent={m.accent} />
          ))}
        </div>

        {/* Top Repos + Language Breakdown — sourced from GitHub public API */}
        {(topRepos.length > 0 || languageBreakdown.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {topRepos.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span>📦</span> Top Repositories
                </h2>
                <div className="space-y-1">
                  {topRepos.map((repo) => (
                    <a key={repo.id} href={repo.html_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 truncate">{repo.name}</p>
                        {repo.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{repo.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {repo.language && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: LANG_COLORS[repo.language] ?? "#94a3b8" }} />
                              {repo.language}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            {new Date(repo.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-1 ml-3 shrink-0">
                        ★ {repo.stargazers_count.toLocaleString()}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {languageBreakdown.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span>🗂️</span> Language Breakdown
                </h2>
                <div className="space-y-3">
                  {languageBreakdown.map(({ lang, pct }) => (
                    <div key={lang} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: LANG_COLORS[lang] ?? "#94a3b8" }} />
                      <span className="text-sm text-slate-700 w-28 truncate">{lang}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: LANG_COLORS[lang] ?? "#6366f1" }} />
                      </div>
                      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Radar + AI Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4">Metric Breakdown</h2>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Radar name="Developer" dataKey="value" fill="#6366f1" fillOpacity={0.3} stroke="#6366f1" strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 text-base">AI Insights</h2>
              <button onClick={() => refreshInsights()} disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {refreshing ? "Generating..." : "✦ Refresh Insights"}
              </button>
            </div>
            <InsightPanel insights={developer.insights ?? {}} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
