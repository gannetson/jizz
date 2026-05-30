type Props = {
  percent: number;
  size?: number;
  stroke?: number;
  trackColor?: string;
  progressColor?: string;
};

export function ProgressRing({
  percent,
  size = 80,
  stroke = 12,
  trackColor = 'var(--chakra-colors-primary-500)',
  progressColor = 'var(--chakra-colors-primary-100)',
}: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={progressColor}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}
