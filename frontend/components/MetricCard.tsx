interface MetricCardProps {
  name: string;
  value: number | string;
  icon?: string;
}

export default function MetricCard({ name, value, icon }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-5 flex items-center gap-4">
      {icon && (
        <span className="text-2xl">{icon}</span>
      )}
      <div>
        <p className="text-sm text-gray-500">{name}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
