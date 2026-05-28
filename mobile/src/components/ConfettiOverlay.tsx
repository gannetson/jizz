import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#eab308', '#ef4444'];
const COUNT = 48;

type Particle = {
  x: number;
  color: string;
  y: Animated.Value;
  rotate: Animated.Value;
  drift: Animated.Value;
};

export function ConfettiOverlay({ active }: { active: boolean }) {
  const { width, height } = Dimensions.get('window');
  const particles = useRef<Particle[] | null>(null);

  if (!particles.current) {
    particles.current = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      y: new Animated.Value(-20 - Math.random() * 80),
      rotate: new Animated.Value(0),
      drift: new Animated.Value(0),
    }));
  }

  const list = particles.current;

  useEffect(() => {
    if (!active) return;
    list.forEach((p) => {
      p.y.setValue(-20 - Math.random() * 80);
      p.rotate.setValue(0);
      p.drift.setValue(0);
    });
    const animations = list.map((p) =>
      Animated.parallel([
        Animated.timing(p.y, {
          toValue: height + 40,
          duration: 2200 + Math.random() * 900,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 180),
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(p.drift, {
          toValue: (Math.random() - 0.5) * 120,
          duration: 2400,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(25, animations).start();
  }, [active, height, list]);

  if (!active) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {list.map((p, i) => (
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
                    inputRange: [0, 540],
                    outputRange: ['0deg', '540deg'],
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
    zIndex: 999,
  },
  piece: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 12,
    borderRadius: 2,
  },
});
