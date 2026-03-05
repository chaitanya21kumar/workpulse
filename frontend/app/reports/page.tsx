"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { TableSkeleton } from "@/components/LoadingSkeletons";

interface Report {
  id: string;
  created_at: string;
  developer_count: number;
  avg_score: number;
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const {
    data: reports,
    isLoading,
    isError,
    refetch,
  } = useQuery<Report[]>({
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      setGenerating(false);
    },
    onError: () => {
      setGenerating(false);
    },
  });

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const reportList = reports ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button
          onClick={() => generateReport()}
          disabled={generating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <p className="text-red-700 text-sm">Failed to load reports.</p>
          <button onClick={() => refetch()} className="text-red-700 underline text-sm">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Developer Count</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
            </tr>
          </thead>
          {isLoading ? (
            <TableSkeleton rows={4} />
          ) : reportList.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                  No reports yet. Click &quot;Generate Report&quot; to create one.
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="bg-white divide-y divide-gray-200">
              {reportList.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{report.developer_count}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{report.avg_score?.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/reports/${report.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
