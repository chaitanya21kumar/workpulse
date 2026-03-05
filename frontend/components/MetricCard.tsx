interface MetricCardProps {
  name: string;
  value: number | string;
  icon?: string;
  accent?: string;
}

export default function MetricCard({ name, value, icon, accent = "indigo" }: MetricCardProps) {
  const accents: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{name}</p>
          <p className="text-3xl font-bold text-slate-800 leading-none">{value}</p>
        </div>
        {icon && (
          <span className={`text-xl p-2 rounded-xl border ${accents[accent] ?? accents.indigo}`}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
