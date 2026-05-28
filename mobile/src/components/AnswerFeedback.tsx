import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors } from '../theme';
import { ConfettiOverlay } from './ConfettiOverlay';

type Props = {
  correct: boolean;
  speciesFrequency?: string | null;
  onAnimationComplete: () => void;
};

const FEEDBACK_MS = 1800;
const VAGRANT_FEEDBACK_MS = 2600;

export function isVagrantMega(correct: boolean, speciesFrequency?: string | null): boolean {
  return correct && speciesFrequency === 'vagrant';
}

export function AnswerFeedback({ correct, speciesFrequency, onAnimationComplete }: Props) {
  const vagrantMega = isVagrantMega(correct, speciesFrequency);
  const duration = vagrantMega ? VAGRANT_FEEDBACK_MS : FEEDBACK_MS;

  useEffect(() => {
    const t = setTimeout(onAnimationComplete, duration);
    return () => clearTimeout(t);
  }, [correct, duration, onAnimationComplete]);

  return (
    <>
      <ConfettiOverlay active={vagrantMega} />
      <View style={styles.overlay}>
        <View
          style={[
            styles.circle,
            correct ? (vagrantMega ? styles.vagrantMega : styles.correct) : styles.incorrect,
            vagrantMega && styles.circleMega,
          ]}
        >
          {correct ? (
            vagrantMega ? (
              <>
                <FontAwesome5 name="star" solid size={44} color="#eab308" />
                <Text style={styles.megaLabel}>MEAGA</Text>
              </>
            ) : (
              <Text style={styles.icon}>✓</Text>
            )
          ) : (
            <Text style={styles.icon}>✗</Text>
          )}
        </View>
      </View>
    </>
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
  circleMega: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fcd34d',
  },
  correct: { backgroundColor: colors.success[500] },
  vagrantMega: { backgroundColor: '#fff' },
  incorrect: { backgroundColor: colors.error[500] },
  icon: { fontSize: 48, color: '#fff', fontWeight: '700' },
  megaLabel: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#b45309',
  },
});
