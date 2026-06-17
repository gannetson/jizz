import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { FloatingFeather } from './FloatingFeather';
import { colors } from '../theme';

type Props = {
  minHeight?: number;
  style?: ViewStyle;
  testID?: string;
};

/** Shown while waiting for the next question (replaces bird media). */
export function QuestionLoadingFeather({ minHeight = 200, style, testID }: Props) {
  return (
    <View
      style={[styles.wrap, minHeight != null && { minHeight }, style]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading next question"
    >
      <FloatingFeather />
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
  },
});
