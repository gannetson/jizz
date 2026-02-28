import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an animated style that pulsates (scale 1 → 1.08 → 1) when `active` is true.
 * Use with Animated.View and style={[baseStyle, active && pulsatingStyle]}.
 */
export function usePulsatingAnimation(active: boolean) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale]);

  return { transform: [{ scale }] };
}
