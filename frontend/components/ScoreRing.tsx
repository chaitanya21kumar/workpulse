interface ScoreRingProps {
  score: number;
  tier: string;
  size?: number;
}

const TIER_COLORS: Record<string, string> = {
  Elite: "#EAB308",
  Senior: "#3B82F6",
  Mid: "#22C55E",
  Junior: "#9CA3AF",
};

export default function ScoreRing({ score, tier, size = 80 }: ScoreRingProps) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = TIER_COLORS[tier] ?? "#9CA3AF";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute text-lg font-bold"
        style={{ color }}
      >
        {Math.round(score)}
      </span>
    </div>
  );
}
