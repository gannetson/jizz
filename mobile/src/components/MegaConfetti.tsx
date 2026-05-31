import React, { useLayoutEffect, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** Ochre / amber palette aligned with Birdr primary + MEGA styling. */
export const MEGA_CONFETTI_COLORS = [
  colors.primary[100],
  colors.primary[200],
  colors.primary[300],
  colors.primary[400],
  colors.primary[500],
  colors.warning[500],
  '#fcd34d',
  '#fbbf24',
  '#f59e0b',
  '#eab308',
  '#d97706',
  '#b45309',
] as const;

const COUNT = 48;

type Particle = {
  x: number;
  color: string;
  y: Animated.Value;
  rotate: Animated.Value;
  drift: Animated.Value;
  duration: number;
  rotDegrees: number;
  driftEnd: number;
};

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: COUNT }, () => {
    const startY = Math.random() * height * 0.4 - height * 0.06;
    return {
      x: Math.random() * Math.max(width - 10, 1),
      color: MEGA_CONFETTI_COLORS[Math.floor(Math.random() * MEGA_CONFETTI_COLORS.length)],
      y: new Animated.Value(startY),
      rotate: new Animated.Value(0),
      drift: new Animated.Value(0),
      duration: 700 + Math.random() * 700,
      rotDegrees: (Math.random() > 0.5 ? 1 : -1) * (160 + Math.random() * 320),
      driftEnd: (Math.random() - 0.5) * 80,
    };
  });
}

function runFallAnimations(particles: Particle[], height: number) {
  Animated.parallel(
    particles.map((p) =>
      Animated.parallel([
        Animated.timing(p.y, {
          toValue: height + 24,
          duration: p.duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: 1,
          duration: p.duration,
          useNativeDriver: true,
        }),
        Animated.timing(p.drift, {
          toValue: p.driftEnd,
          duration: p.duration,
          useNativeDriver: true,
        }),
      ])
    )
  ).start();
}

export function MegaConfetti({ active }: { active: boolean }) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayout({ width, height });
    }
  };

  useLayoutEffect(() => {
    if (!active || layout.width <= 0 || layout.height <= 0) {
      setParticles([]);
      return;
    }
    const burst = createParticles(layout.width, layout.height);
    setParticles(burst);
    runFallAnimations(burst, layout.height);
  }, [active, layout.width, layout.height]);

  if (!active) return null;

  return (
    <View style={styles.overlay} pointerEvents="none" onLayout={onLayout}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.piece,
            { left: p.x, backgroundColor: p.color },
            {
              transform: [
                { translateY: p.y },
                { translateX: p.drift },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${p.rotDegrees}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
    top: 0,
    width: 7,
    height: 11,
    borderRadius: 2,
  },
});
