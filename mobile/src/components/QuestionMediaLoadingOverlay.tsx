import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FloatingFeather } from './FloatingFeather';
import { ProgressRing } from './ProgressRing';
import { colors } from '../theme';

type Props = {
  /** 0–1 when download size is known; null shows feather only. */
  progress?: number | null;
  featherSize?: number;
};

const RING_SIZE = 140;
const FEATHER_SIZE = 50;

/** Centered loader for question media: progress ring when known, floating feather always. */
export function QuestionMediaLoadingOverlay({ progress = null, featherSize = FEATHER_SIZE }: Props) {
  const hasProgress = progress != null && progress >= 0;
  const percent = hasProgress ? Math.round(Math.min(1, progress) * 100) : 0;

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel="Loading media">
      <View style={styles.center}>
        {hasProgress ? (
          <View style={styles.ring}>
            <ProgressRing percent={percent} size={RING_SIZE} stroke={5} />
          </View>
        ) : null}
        <FloatingFeather size={featherSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: 8,
  },
  center: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
