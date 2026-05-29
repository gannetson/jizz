import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors } from '../theme';
import { ConfettiOverlay } from './ConfettiOverlay';
import { useTranslation } from '../i18n/TranslationContext';

type Props = {
  correct: boolean;
  speciesFrequency?: string | null;
  onAnimationComplete: () => void;
};

const FEEDBACK_MS = 1800;
const VAGRANT_FEEDBACK_MS = 2800;

export function normalizeSpeciesFrequency(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return value || null;
}

export function isVagrantMega(correct: boolean, speciesFrequency?: string | null): boolean {
  return correct && normalizeSpeciesFrequency(speciesFrequency) === 'vagrant';
}

export function AnswerFeedback({ correct, speciesFrequency, onAnimationComplete }: Props) {
  const { t } = useTranslation();
  const vagrantMega = isVagrantMega(correct, speciesFrequency);
  const duration = vagrantMega ? VAGRANT_FEEDBACK_MS : FEEDBACK_MS;

  useEffect(() => {
    const timer = setTimeout(onAnimationComplete, duration);
    return () => clearTimeout(timer);
  }, [correct, duration, onAnimationComplete]);

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
      <View style={styles.modalRoot} pointerEvents="none">
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
                  <Text style={styles.megaLabel}>{t('mega', 'MEGA!')}</Text>
                </>
              ) : (
                <Text style={styles.icon}>✓</Text>
              )
            ) : (
              <Text style={styles.icon}>✗</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
    elevation: 24,
  },
  circleMega: {
    width: 132,
    height: 132,
    borderRadius: 66,
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
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#b45309',
  },
});
