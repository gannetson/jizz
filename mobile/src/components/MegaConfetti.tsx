import React, { useLayoutEffect, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, View } from 'react-native';
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

const COUNT = 64;

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
    const startY = Math.random() * height * 0.35 - height * 0.08;
    return {
      x: Math.random() * Math.max(width - 10, 1),
      color: MEGA_CONFETTI_COLORS[Math.floor(Math.random() * MEGA_CONFETTI_COLORS.length)],
      y: new Animated.Value(startY),
      rotate: new Animated.Value(0),
      drift: new Animated.Value(0),
      duration: 700 + Math.random() * 700,
      rotDegrees: (Math.random() > 0.5 ? 1 : -1) * (160 + Math.random() * 320),
      driftEnd: (Math.random() - 0.5) * 100,
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
  const [screen, setScreen] = useState(() => Dimensions.get('window'));
  const [particles, setParticles] = useState<Particle[]>([]);

  useLayoutEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setScreen(window);
    });
    return () => sub.remove();
  }, []);

  useLayoutEffect(() => {
    if (!active || screen.width <= 0 || screen.height <= 0) {
      setParticles([]);
      return;
    }
    const burst = createParticles(screen.width, screen.height);
    setParticles(burst);
    runFallAnimations(burst, screen.height);
  }, [active, screen.width, screen.height]);

  if (!active) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.overlay} pointerEvents="none">
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
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
