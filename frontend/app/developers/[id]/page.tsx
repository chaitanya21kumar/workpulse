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

const TIER_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  Elite:  { bg: "rgba(234,179,8,0.2)",   color: "#fbbf24", border: "rgba(234,179,8,0.3)" },
  Senior: { bg: "rgba(59,130,246,0.2)",  color: "#60a5fa", border: "rgba(59,130,246,0.3)" },
  Mid:    { bg: "rgba(34,197,94,0.2)",   color: "#4ade80", border: "rgba(34,197,94,0.3)" },
  Junior: { bg: "rgba(100,116,139,0.2)", color: "#94a3b8", border: "rgba(100,116,139,0.3)" },
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
      const dev: Developer = res.data.developer ?? res.data;
      if (res.data.report?.ai_insights) {
        dev.insights = res.data.report.ai_insights;
      }
      return dev;
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
              <div
                key={i}
                className="animate-pulse rounded-2xl p-5 h-28"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              />
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
          <div
            className="rounded-2xl p-6 flex items-center justify-between"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <div>
              <p className="text-red-400 font-semibold">Failed to load developer profile</p>
              <p className="text-red-400/70 text-sm mt-1">The developer may not exist or the connection failed.</p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "rgba(239,68,68,0.6)" }}
            >
              Retry
            </button>
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
          <Link href="/dashboard" className="text-indigo-400 text-sm mt-2 inline-block hover:underline">← Back to Dashboard</Link>
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

  const tierStyle = developer.tier ? (TIER_STYLES[developer.tier] ?? TIER_STYLES.Junior) : null;

  return (
    <AppShell>
      <div className="space-y-6" style={{ background: "#0b0b14", minHeight: "100%" }}>
        {/* Hero Section */}
        <div
          className="px-8 pt-8 pb-6"
          style={{
            background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.2) 0%, transparent 60%), #0b0b14",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-6">
            <Link href="/dashboard" className="transition-colors" style={{ color: "#475569" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#a5b4fc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#475569"; }}
            >
              Dashboard
            </Link>
            <span style={{ color: "#334155" }}>/</span>
            <span style={{ color: "#94a3b8" }}>{developer.display_name || developer.github_username}</span>
          </div>

          {/* Profile header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {/* Avatar 96px with glow ring */}
              {developer.avatar_url ? (
                <Image
                  src={developer.avatar_url}
                  alt={developer.display_name || developer.github_username || ""}
                  width={96}
                  height={96}
                  className="rounded-full"
                  style={{
                    outline: "2px solid rgba(99,102,241,0.4)",
                    outlineOffset: "2px",
                    boxShadow: "0 0 20px rgba(99,102,241,0.3)",
                  }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold"
                  style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    outline: "2px solid rgba(99,102,241,0.4)",
                    outlineOffset: "2px",
                    boxShadow: "0 0 20px rgba(99,102,241,0.3)",
                  }}
                >
                  {initial}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-white">{developer.display_name || developer.github_username}</h1>
                <p className="text-slate-400 text-sm mt-0.5">@{developer.github_username}</p>
                {developer.tier && tierStyle && (
                  <span
                    className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: tierStyle.bg,
                      color: tierStyle.color,
                      border: `1px solid ${tierStyle.border}`,
                    }}
                  >
                    {developer.tier}
                  </span>
                )}
              </div>
            </div>
            {developer.score != null && <ScoreRing score={developer.score} tier={developer.tier ?? "Junior"} size={80} />}
          </div>
        </div>

        <div className="px-8 space-y-6 pb-8">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <MetricCard key={m.name} name={m.name} value={m.value} icon={m.icon} accent={m.accent} />
            ))}
          </div>

          {/* Top Repos + Language Breakdown */}
          {(topRepos.length > 0 || languageBreakdown.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {topRepos.length > 0 && (
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                    <span>📦</span> Top Repositories
                  </h2>
                  <div className="space-y-1">
                    {topRepos.map((repo) => (
                      <a
                        key={repo.id}
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors group"
                        style={{ color: "inherit" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <div className="min-w-0">
                          <p
                            className="text-sm font-semibold truncate"
                            style={{ color: "#e2e8f0" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#a5b4fc"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; }}
                          >
                            {repo.name}
                          </p>
                          {repo.description && (
                            <p className="text-xs truncate mt-0.5" style={{ color: "#475569" }}>{repo.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1">
                            {repo.language && (
                              <span className="text-xs flex items-center gap-1" style={{ color: "#64748b" }}>
                                <span
                                  className="w-2 h-2 rounded-full inline-block shrink-0"
                                  style={{ backgroundColor: LANG_COLORS[repo.language] ?? "#94a3b8" }}
                                />
                                {repo.language}
                              </span>
                            )}
                            <span className="text-xs" style={{ color: "#475569" }}>
                              {new Date(repo.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold flex items-center gap-1 ml-3 shrink-0" style={{ color: "#fbbf24" }}>
                          ★ {repo.stargazers_count.toLocaleString()}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {languageBreakdown.length > 0 && (
                <div
                  className="rounded-2xl p-6"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                    <span>🗂️</span> Language Breakdown
                  </h2>
                  <div className="space-y-3">
                    {languageBreakdown.map(({ lang, pct }) => (
                      <div key={lang} className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: LANG_COLORS[lang] ?? "#94a3b8" }}
                        />
                        <span className="text-sm w-28 truncate" style={{ color: "#94a3b8" }}>{lang}</span>
                        <div
                          className="flex-1 rounded-full h-2 overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                        >
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: LANG_COLORS[lang] ?? "#6366f1" }}
                          />
                        </div>
                        <span className="text-xs w-8 text-right" style={{ color: "#475569" }}>{pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Radar + AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div
              className="lg:col-span-2 rounded-2xl p-6"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h2 className="font-bold text-white mb-4">Metric Breakdown</h2>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData} style={{ background: "#0f0f1a" }}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#475569" }} />
                  <Radar
                    name="Developer"
                    dataKey="value"
                    fill="rgba(99,102,241,0.3)"
                    fillOpacity={1}
                    stroke="#6366f1"
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white text-base">AI Insights</h2>
                <button
                  onClick={() => refreshInsights()}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                  style={{
                    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    boxShadow: "0 0 16px rgba(99,102,241,0.3)",
                  }}
                >
                  {refreshing ? "Generating..." : "✦ Refresh Insights"}
                </button>
              </div>
              <InsightPanel insights={developer.insights ?? {}} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
