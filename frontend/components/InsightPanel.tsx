interface Insights {
  summary?: string;
  strengths?: string[];
  improvements?: string[];
  action_items?: string[];
  team_impact?: string;
  predicted_trend?: string;
}

export default function InsightPanel({ insights }: { insights: Insights }) {
  if (!insights || !insights.summary) {
    return (
      <div className="bg-white rounded-lg shadow p-5 text-gray-400">
        No AI insights available. Click &quot;Refresh Insights&quot; to generate.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-5 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">AI Insights</h3>

      <div>
        <p className="text-gray-700">{insights.summary}</p>
      </div>

      {insights.strengths && insights.strengths.length > 0 && (
        <div>
          <h4 className="font-medium text-green-700 mb-1">Strengths</h4>
          <ul className="list-disc list-inside space-y-1">
            {insights.strengths.map((s, i) => (
              <li key={i} className="text-sm text-gray-600">{s}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.improvements && insights.improvements.length > 0 && (
        <div>
          <h4 className="font-medium text-orange-700 mb-1">Areas for Improvement</h4>
          <ul className="list-disc list-inside space-y-1">
            {insights.improvements.map((s, i) => (
              <li key={i} className="text-sm text-gray-600">{s}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.action_items && insights.action_items.length > 0 && (
        <div>
          <h4 className="font-medium text-blue-700 mb-1">Action Items</h4>
          <ul className="list-disc list-inside space-y-1">
            {insights.action_items.map((s, i) => (
              <li key={i} className="text-sm text-gray-600">{s}</li>
            ))}
          </ul>
        </div>
      )}

      {insights.team_impact && (
        <div>
          <h4 className="font-medium text-purple-700 mb-1">Team Impact</h4>
          <p className="text-sm text-gray-600">{insights.team_impact}</p>
        </div>
      )}

      {insights.predicted_trend && (
        <div>
          <h4 className="font-medium text-gray-700 mb-1">Predicted Trend</h4>
          <p className="text-sm text-gray-600">{insights.predicted_trend}</p>
        </div>
      )}
    </div>
  );
}
