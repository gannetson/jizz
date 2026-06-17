import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { FloatingFeather } from './FloatingFeather';
import { colors } from '../theme';

type Props = {
  /** Fixed stage height (preferred — prevents layout jump vs question media). */
  height?: number;
  minHeight?: number;
  style?: ViewStyle;
  testID?: string;
};

/** Shown while waiting for the next question (replaces bird media). */
export function QuestionLoadingFeather({ height, minHeight, style, testID }: Props) {
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
