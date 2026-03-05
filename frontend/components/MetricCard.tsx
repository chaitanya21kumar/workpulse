interface MetricCardProps {
  name: string;
  value: number | string;
  icon?: string;
  accent?: string;
}

export default function MetricCard({ name, value, icon, accent = "indigo" }: MetricCardProps) {
  const accentColors: Record<string, { bg: string; color: string; border: string }> = {
    indigo: { bg: "rgba(99,102,241,0.15)",  color: "#a5b4fc", border: "rgba(99,102,241,0.25)" },
    emerald: { bg: "rgba(34,197,94,0.15)",  color: "#86efac", border: "rgba(34,197,94,0.25)" },
    amber:   { bg: "rgba(245,158,11,0.15)", color: "#fcd34d", border: "rgba(245,158,11,0.25)" },
    blue:    { bg: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "rgba(59,130,246,0.25)" },
    purple:  { bg: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "rgba(139,92,246,0.25)" },
    rose:    { bg: "rgba(244,63,94,0.15)",  color: "#fda4af", border: "rgba(244,63,94,0.25)" },
  };

  const a = accentColors[accent] ?? accentColors.indigo;

  return (
    <div
      className="rounded-2xl p-5 transition-all"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "#64748b" }}
          >
            {name}
          </p>
          <p className="text-3xl font-bold text-white leading-none">{value}</p>
        </div>
        {icon && (
          <span
            className="text-xl p-2 rounded-xl"
            style={{
              background: a.bg,
              color: a.color,
              border: `1px solid ${a.border}`,
            }}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
