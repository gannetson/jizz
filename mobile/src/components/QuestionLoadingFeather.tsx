import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { FloatingFeather } from './FloatingFeather';
import { colors } from '../theme';
import { useTranslation } from '../i18n/TranslationContext';
import { useDelayedFlag } from '../hooks/useDelayedFlag';

type Props = {
  /** Fixed stage height (preferred — prevents layout jump vs question media). */
  height?: number;
  minHeight?: number;
  style?: ViewStyle;
  testID?: string;
};

/** Shown while waiting for the next question (replaces bird media). */
export function QuestionLoadingFeather({ height, minHeight, style, testID }: Props) {
  const { t } = useTranslation();
  const showSlowHint = useDelayedFlag(true, 2500);
  const sizeStyle =
    height != null
      ? { height, minHeight: height }
      : minHeight != null
        ? { minHeight }
        : undefined;

  return (
    <View
      style={[style, styles.wrap, sizeStyle]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={t('loading_question')}
    >
      <FloatingFeather />
      <Text style={styles.label}>{t('loading_question')}</Text>
      {showSlowHint ? (
        <Text style={styles.slowHint} testID="play.slowLoadHint">
          {t('loading_taking_long')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: colors.primary[700],
    textAlign: 'center',
  },
  slowHint: {
    fontSize: 13,
    color: colors.primary[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});
