import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../theme';

export type SpeciesViewButtonVariant =
  | 'primary'
  | 'correct'
  | 'wrong'
  | 'revealed'
  | 'secondary'
  | 'compare';

type Props = {
  /** Main label (e.g. species name or "Comparison") */
  label: string;
  onPress: (e?: any) => void;
  variant?: SpeciesViewButtonVariant;
  /** Show check (✓) or cross (✗) icon on the left */
  icon?: 'correct' | 'wrong';
  /** Right-side label; defaults to "View ›" */
  viewLabel?: string;
  disabled?: boolean;
};

const variantStyles: Record<SpeciesViewButtonVariant, { button: ViewStyle; text: TextStyle; viewText: TextStyle }> = {
  primary: {
    button: { backgroundColor: colors.primary[500] },
    text: { color: colors.primary[50] },
    viewText: { color: 'rgba(255,255,255,0.8)' },
  },
  correct: {
    button: { backgroundColor: colors.success[500] },
    text: { color: colors.primary[50] },
    viewText: { color: 'rgba(255,255,255,0.8)' },
  },
  wrong: {
    button: { backgroundColor: colors.error[500] },
    text: { color: colors.primary[50] },
    viewText: { color: 'rgba(255,255,255,0.8)' },
  },
  revealed: {
    button: { backgroundColor: colors.primary[200] },
    text: { color: colors.primary[800] },
    viewText: { color: colors.primary[800] },
  },
  secondary: {
    button: { backgroundColor: colors.primary[200] },
    text: { color: colors.primary[800] },
    viewText: { color: colors.primary[800] },
  },
  compare: {
    button: { backgroundColor: colors.primary[200] },
    text: { color: colors.primary[800] },
    viewText: { color: colors.primary[800] },
  },
};

export function SpeciesViewButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  viewLabel = 'View ›',
  disabled = false,
}: Props) {
  const vs = variantStyles[variant];
  return (
    <TouchableOpacity
      style={[styles.button, vs.button, disabled && styles.disabled]}
      onPress={(e) => onPress(e)}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        {icon && (
          <View style={[styles.icon, icon === 'correct' ? styles.iconCorrect : styles.iconWrong]}>
            <Text style={styles.iconText}>{icon === 'correct' ? '✓' : '✗'}</Text>
          </View>
        )}
        <Text style={[styles.label, vs.text]} numberOfLines={2}>
          {label}
        </Text>
        <Text style={[styles.viewText, vs.viewText]}>{viewLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabled: { opacity: 0.6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCorrect: { backgroundColor: 'rgba(255,255,255,0.3)' },
  iconWrong: { backgroundColor: 'rgba(255,255,255,0.3)' },
  iconText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  label: { fontSize: 16, fontWeight: '500', flex: 1, marginRight: 8 },
  viewText: { fontSize: 13, fontWeight: '600' },
});
