"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";

interface Report {
  id: string;
  created_at: string;
  developer_count: number;
  avg_score: number;
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const { data: reports, isLoading, isError, refetch } = useQuery<Report[]>({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await api.get("/api/v1/reports");
      return res.data;
    },
    enabled: !!user,
  });

  const { mutate: generateReport } = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      await api.post("/api/v1/reports");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); setGenerating(false); },
    onError: () => setGenerating(false),
  });

  if (authLoading || !user) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "#0b0b14" }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const reportList = reports ?? [];

  const scoreColor = (s: number) => {
    if (s >= 70) return "#4ade80";
    if (s >= 50) return "#60a5fa";
    return "#fbbf24";
  };

  return (
    <AppShell>
      <div
        className="px-8 py-7"
        style={{ background: "#0b0b14", minHeight: "100%" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports</h1>
            <p className="text-sm mt-0.5" style={{ color: "#475569" }}>
              AI-generated performance reports for your team
            </p>
          </div>
          <button
            onClick={() => generateReport()}
            disabled={generating}
            style={{
              background: generating
                ? "rgba(99,102,241,0.5)"
                : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: generating ? "none" : "0 0 16px rgba(99,102,241,0.35)",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: generating ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            {generating ? (
              <>
                <span className="animate-spin inline-block">⟳</span>
                Generating...
              </>
            ) : (
              "✦ Generate Report"
            )}
          </button>
        </div>

        {/* Error state */}
        {isError && (
          <div
            className="rounded-xl p-4 mb-5 flex items-center justify-between"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "#fca5a5" }}>
              Failed to load reports.
            </p>
            <button
              onClick={() => refetch()}
              className="text-sm font-semibold underline"
              style={{ color: "#fca5a5" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl h-36"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                />
              ))}
          </div>
        ) : reportList.length === 0 ? (
          /* Empty state */
          <div
            className="rounded-2xl py-20 text-center"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(99,102,241,0.15)" }}
            >
              <span className="text-2xl" style={{ color: "rgba(99,102,241,0.8)" }}>
                📋
              </span>
            </div>
            <p className="font-semibold" style={{ color: "#e2e8f0" }}>
              No reports yet
            </p>
            <p className="text-sm mt-1" style={{ color: "#475569" }}>
              Generate your first report to get team insights
            </p>
          </div>
        ) : (
          /* Report cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reportList.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl p-6 transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.border =
                    "1px solid rgba(99,102,241,0.25)";
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.border =
                    "1px solid rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.03)";
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(99,102,241,0.15)" }}
                  >
                    <span className="text-lg">📋</span>
                  </div>
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {new Date(report.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs uppercase tracking-wider"
                      style={{ color: "#475569" }}
                    >
                      Developers
                    </span>
                    <span className="text-sm font-bold text-white">
                      {report.developer_count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs uppercase tracking-wider"
                      style={{ color: "#475569" }}
                    >
                      Avg Score
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: scoreColor(report.avg_score) }}
                    >
                      {report.avg_score?.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/reports/${report.id}`}
                  className="block w-full text-center py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,0.2)",
                  }}
                >
                  View Report →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
