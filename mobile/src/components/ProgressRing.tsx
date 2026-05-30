import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

type Props = {
  percent: number;
  size?: number;
  stroke?: number;
  trackColor?: string;
  progressColor?: string;
};

export function ProgressRing({
  percent,
  size = 72,
  stroke = 6,
  trackColor = colors.primary[100],
  progressColor = colors.primary[600],
}: Props) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={trackColor}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={progressColor}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}
