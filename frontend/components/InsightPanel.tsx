interface Insights {
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  action_items?: string[];
  team_impact?: string;
  predicted_trend?: string;
}

const TREND_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  improving: { bg: "bg-emerald-100", text: "text-emerald-700", label: "↑ Improving" },
  stable:    { bg: "bg-blue-100",    text: "text-blue-700",    label: "→ Stable" },
  declining: { bg: "bg-red-100",     text: "text-red-700",     label: "↓ Declining" },
};

export default function InsightPanel({ insights }: { insights: Insights }) {
  if (!insights?.summary) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🤖</span>
        </div>
        <p className="text-slate-600 font-medium">No AI insights yet</p>
        <p className="text-slate-400 text-sm mt-1">Click &quot;Refresh Insights&quot; to generate analysis</p>
      </div>
    );
  }

  const trendStyle = TREND_STYLES[insights.predicted_trend ?? "stable"] ?? TREND_STYLES.stable;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800">Summary</h3>
          {insights.predicted_trend && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trendStyle.bg} ${trendStyle.text}`}>
              {trendStyle.label}
            </span>
          )}
        </div>
        <p className="text-slate-600 text-sm leading-relaxed">{insights.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strengths */}
        {insights.strengths && insights.strengths.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <h4 className="font-bold text-emerald-800 text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">✓</span>
              Strengths
            </h4>
            <ul className="space-y-2">
              {insights.strengths.map((s, i) => (
                <li key={i} className="text-xs text-emerald-700 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Improvements */}
        {insights.improvements && insights.improvements.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h4 className="font-bold text-amber-800 text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">!</span>
              Improvements
            </h4>
            <ul className="space-y-2">
              {insights.improvements.map((s, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Items */}
        {insights.action_items && insights.action_items.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
            <h4 className="font-bold text-indigo-800 text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">→</span>
              Actions
            </h4>
            <ul className="space-y-2">
              {insights.action_items.map((s, i) => (
                <li key={i} className="text-xs text-indigo-700 flex items-start gap-2">
                  <span className="text-indigo-400 mt-0.5 shrink-0">•</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Team Impact */}
      {insights.team_impact && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-4 flex items-center gap-3">
          <span className="text-lg">👥</span>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Impact</p>
            <p className="text-sm text-slate-700 font-medium mt-0.5">{insights.team_impact}</p>
          </div>
        </div>
      )}
    </div>
  );
}
