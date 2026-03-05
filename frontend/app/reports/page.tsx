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
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const reportList = reports ?? [];
  const scoreColor = (s: number) => s >= 70 ? "text-emerald-600" : s >= 50 ? "text-blue-600" : "text-amber-600";

  return (
    <AppShell>
      <div className="px-8 py-7">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
            <p className="text-slate-500 text-sm mt-0.5">AI-generated performance reports for your team</p>
          </div>
          <button onClick={() => generateReport()} disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200">
            {generating ? <><span className="animate-spin">⟳</span> Generating...</> : "✦ Generate Report"}
          </button>
        </div>

        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center justify-between">
            <p className="text-red-700 text-sm font-medium">Failed to load reports.</p>
            <button onClick={() => refetch()} className="text-red-600 text-sm font-semibold underline">Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-200 h-36" />
            ))}
          </div>
        ) : reportList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-slate-700 font-semibold">No reports yet</p>
            <p className="text-slate-400 text-sm mt-1">Generate your first report to get team insights</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reportList.map((report) => (
              <div key={report.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <span className="text-lg">📋</span>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Developers</span>
                    <span className="text-sm font-bold text-slate-800">{report.developer_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Avg Score</span>
                    <span className={`text-sm font-bold ${scoreColor(report.avg_score)}`}>{report.avg_score?.toFixed(1)}</span>
                  </div>
                </div>
                <Link href={`/reports/${report.id}`}
                  className="block w-full text-center py-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-semibold hover:bg-indigo-100 transition-colors">
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
