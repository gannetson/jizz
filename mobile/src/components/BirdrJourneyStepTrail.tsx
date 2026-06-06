import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import type { JourneyLevel, JourneyStep } from '../api/birdrJourney';
import { isFamilyJourneyStep } from '../api/birdrJourney';
import { BirdrLevelImage } from './BirdrLevelImage';
import { useTranslation } from '../i18n/TranslationContext';
import { colors } from '../theme';

type Props = {
  currentLevel: JourneyLevel;
  nextLevel: JourneyLevel | null;
  onStepPress: (step: JourneyStep) => void;
  /** When false, the current step is shown but not tappable (e.g. already played today). */
  canPlay?: boolean;
};

const STEP_SIZE = 44;
const CURRENT_STEP_SIZE = 72;

/** Gentle scale pulse every ~2s to draw attention to the active step. */
function useCurrentStepPulse(active: boolean) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.delay(1100),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, scale]);

  return { transform: [{ scale }] };
}

function StepIcon({
  step,
  onPress,
  canPlay,
  playLabel,
}: {
  step: JourneyStep;
  onPress?: () => void;
  canPlay?: boolean;
  playLabel: string;
}) {
  const isCompleted = step.status === 'completed';
  const isCurrent = step.status === 'current';
  const isLocked = step.status === 'locked';
  const isPlayable = isCurrent && !!onPress && !!canPlay;
  const pulseStyle = useCurrentStepPulse(isPlayable);
  const size = isCurrent ? CURRENT_STEP_SIZE : STEP_SIZE;
  const iconSize = isCurrent ? 28 : 20;

  const backgroundColor = isCompleted
    ? colors.primary[500]
    : isCurrent
      ? colors.primary[800]
      : colors.primary[200];

  const iconColor = isLocked ? colors.primary[400] : colors.primary[50];

  const circle = (
    <View
      style={[
        styles.stepCircle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
        isCurrent && styles.stepCircleCurrent,
      ]}
    >
      {isCompleted ? (
        <FontAwesome5 name="check" size={iconSize - 8} color={iconColor} />
      ) : isFamilyJourneyStep(step) ? (
        <FontAwesome5 name="book-open" size={iconSize - 2} color={iconColor} />
      ) : (
        <Feather name="feather" size={iconSize} color={iconColor} />
      )}
    </View>
  );

  if (isCurrent && onPress && canPlay) {
    return (
      <TouchableOpacity
        style={styles.currentStepWrap}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={playLabel}
        testID={`journey.step.${step.sequence}`}
        activeOpacity={0.85}
      >
        <Animated.View style={[styles.currentStepPulseWrap, pulseStyle]}>
          {circle}
          <Text style={styles.playLabel}>{playLabel}</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  if (isCurrent) {
    return (
      <View style={styles.currentStepWrap}>
        <Animated.View style={pulseStyle}>{circle}</Animated.View>
      </View>
    );
  }

  return circle;
}

/** Vertical step trail: level at top, steps downward, next level at bottom. */
export function BirdrJourneyStepTrail({ currentLevel, nextLevel, onStepPress, canPlay = true }: Props) {
  const { t } = useTranslation();
  const steps = [...(currentLevel.steps ?? [])].sort((a, b) => a.sequence - b.sequence);

  return (
    <View style={styles.trail}>
      <BirdrLevelImage
        iconUrl={currentLevel.icon_url}
        variant="current"
        size={140}
      />
      <View style={styles.connector} />

      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepColumn}>
          <StepIcon
            step={step}
            onPress={step.status === 'current' ? () => onStepPress(step) : undefined}
            canPlay={canPlay}
            playLabel={t('play')}
          />
          {index < steps.length - 1 && <View style={styles.connector} />}
        </View>
      ))}

      {nextLevel && (
        <>
          <View style={styles.connector} />
          <BirdrLevelImage
            iconUrl={nextLevel.icon_url}
            variant="next"
            size={140}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trail: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  stepColumn: {
    alignItems: 'center',
  },
  stepCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleCurrent: {
    borderWidth: 3,
    borderColor: colors.primary[400],
  },
  currentStepWrap: {
    alignItems: 'center',
  },
  currentStepPulseWrap: {
    alignItems: 'center',
  },
  playLabel: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[800],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connector: {
    width: 4,
    height: 24,
    marginVertical: 4,
    borderRadius: 2,
    backgroundColor: colors.primary[200],
  },
});
