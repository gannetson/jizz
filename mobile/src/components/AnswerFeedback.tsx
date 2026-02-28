import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

type Props = { correct: boolean; onAnimationComplete: () => void };

export function AnswerFeedback({ correct, onAnimationComplete }: Props) {
  useEffect(() => {
    const t = setTimeout(onAnimationComplete, 1800);
    return () => clearTimeout(t);
  }, [correct, onAnimationComplete]);

  return (
    <View style={styles.overlay}>
      <View style={[styles.circle, correct ? styles.correct : styles.incorrect]}>
        <Text style={styles.icon}>{correct ? '✓' : '✗'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  correct: { backgroundColor: colors.success[500] },
  incorrect: { backgroundColor: colors.error[500] },
  icon: { fontSize: 48, color: '#fff', fontWeight: '700' },
});
