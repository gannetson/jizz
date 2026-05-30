import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { colors } from '../theme';
import { MegaConfetti } from './MegaConfetti';
import { useTranslation } from '../i18n/TranslationContext';

type Props = {
  correct: boolean;
  speciesFrequency?: string | null;
  checklistAdded?: boolean;
  onAnimationComplete: () => void;
};

const FEEDBACK_MS = 1800;
const VAGRANT_FEEDBACK_MS = 2800;
const CHECKLIST_EXTRA_MS = 700;

export function normalizeSpeciesFrequency(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return value || null;
}

export function normalizeChecklistAdded(raw: unknown): boolean {
  return raw === true;
}

export function isVagrantMega(correct: boolean, speciesFrequency?: string | null): boolean {
  return correct && normalizeSpeciesFrequency(speciesFrequency) === 'vagrant';
}

function ChecklistAddedBadge({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0);
      opacity.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.delay(280),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [visible, scale, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.checklistPill,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <FontAwesome5 name="check-square" solid size={20} color={colors.success[500]} />
      <Text style={styles.checklistPillText}>
        {t('checklist_added_toast')}
      </Text>
    </Animated.View>
  );
}

export function AnswerFeedback({
  correct,
  speciesFrequency,
  checklistAdded = false,
  onAnimationComplete,
}: Props) {
  const { t } = useTranslation();
  const vagrantMega = isVagrantMega(correct, speciesFrequency);
  const showChecklistBadge = correct && checklistAdded;
  const duration = vagrantMega
    ? VAGRANT_FEEDBACK_MS
    : showChecklistBadge
      ? FEEDBACK_MS + CHECKLIST_EXTRA_MS
      : FEEDBACK_MS;

  useEffect(() => {
    const timer = setTimeout(onAnimationComplete, duration);
    return () => clearTimeout(timer);
  }, [correct, duration, onAnimationComplete]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      {vagrantMega && <MegaConfetti active />}
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
      <ChecklistAddedBadge visible={showChecklistBadge} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
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
  checklistPill: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.success[500],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    maxWidth: 280,
  },
  checklistPillText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.success[500],
    flexShrink: 1,
  },
});
