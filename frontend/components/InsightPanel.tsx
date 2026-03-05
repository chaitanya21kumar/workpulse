interface Insights {
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  action_items?: string[];
  team_impact?: string;
  predicted_trend?: string;
}

const TREND_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  improving: { bg: "rgba(34,197,94,0.15)",  color: "#4ade80", border: "rgba(34,197,94,0.25)",  label: "↑ Improving" },
  stable:    { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "rgba(59,130,246,0.25)", label: "→ Stable" },
  declining: { bg: "rgba(239,68,68,0.15)",  color: "#f87171", border: "rgba(239,68,68,0.25)",  label: "↓ Declining" },
};

export default function InsightPanel({ insights }: { insights: Insights }) {
  if (!insights?.summary) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "#0d1117",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <span className="text-2xl">🤖</span>
        </div>
        <p className="font-medium" style={{ color: "#94a3b8" }}>No AI insights yet</p>
        <p className="text-sm mt-1" style={{ color: "#475569" }}>Click &quot;Refresh Insights&quot; to generate analysis</p>
      </div>
    );
  }

  const trendStyle = TREND_STYLES[insights.predicted_trend ?? "stable"] ?? TREND_STYLES.stable;

  return (
    <div className="space-y-4">
      {/* Summary — dark terminal panel */}
      <div
        className="rounded-2xl p-6"
        style={{
          background: "#0d1117",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white">Summary</h3>
          {insights.predicted_trend && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: trendStyle.bg,
                color: trendStyle.color,
                border: `1px solid ${trendStyle.border}`,
              }}
            >
              {trendStyle.label}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "#00ff88", opacity: 0.85 }}>{insights.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strengths */}
        {insights.strengths && insights.strengths.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "#4ade80" }}>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                style={{ background: "#16a34a" }}
              >
                ✓
              </span>
              Strengths
            </h4>
            <ul className="space-y-2">
              {insights.strengths.map((s, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: "#86efac" }}>
                  <span className="mt-0.5 shrink-0" style={{ color: "#4ade80" }}>•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {insights.improvements && insights.improvements.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "#fbbf24" }}>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                style={{ background: "#d97706" }}
              >
                !
              </span>
              Improvements
            </h4>
            <ul className="space-y-2">
              {insights.improvements.map((s, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: "#fde68a" }}>
                  <span className="mt-0.5 shrink-0" style={{ color: "#fbbf24" }}>•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {insights.action_items && insights.action_items.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: "#a5b4fc" }}>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white"
                style={{ background: "#4f46e5" }}
              >
                →
              </span>
              Actions
            </h4>
            <ul className="space-y-2">
              {insights.action_items.map((s, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: "#c7d2fe" }}>
                  <span className="mt-0.5 shrink-0" style={{ color: "#a5b4fc" }}>•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Team Impact */}
      {insights.team_impact && (
        <div
          className="rounded-2xl px-6 py-4 flex items-center gap-3"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <span className="text-lg">👥</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#475569" }}>
              Team Impact
            </p>
            <p className="text-sm font-medium mt-0.5" style={{ color: "#00ff88", opacity: 0.8 }}>
              {insights.team_impact}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
