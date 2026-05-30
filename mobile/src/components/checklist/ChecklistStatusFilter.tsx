import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import type { ChecklistTotals } from '../../api/checklist';
import { colors } from '../../theme';

export type ChecklistStatusFilterKey = 'all' | 'identified' | 'missed' | 'unseen';

const OPTIONS: {
  value: ChecklistStatusFilterKey;
  labelKey: string;
  fallback: string;
  countKey: keyof ChecklistTotals;
}[] = [
  { value: 'all', labelKey: 'checklist_filter_all', fallback: 'All', countKey: 'all' },
  { value: 'identified', labelKey: 'checklist_summary_seen', fallback: 'Seen', countKey: 'identified' },
  { value: 'missed', labelKey: 'checklist_summary_missed', fallback: 'Missed', countKey: 'missed' },
  { value: 'unseen', labelKey: 'checklist_summary_unseen', fallback: 'Unseen', countKey: 'unseen' },
];

type Props = {
  value: ChecklistStatusFilterKey;
  onChange: (value: ChecklistStatusFilterKey) => void;
  totals: ChecklistTotals;
  t: (key: string, fallback?: string) => string;
};

export function ChecklistStatusFilter({ value, onChange, totals, t }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          const label = t(opt.labelKey, opt.fallback);
          const count = totals[opt.countKey];
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.pane, active && styles.paneActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.paneLabel, active && styles.paneLabelActive]}>{label}</Text>
              <Text style={[styles.count, active && styles.countActive]}>{count}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  pane: {
    width: 88,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.primary[100],
  },
  paneActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  paneLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary[800],
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[600],
    marginTop: 4,
  },
  countActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  paneLabelActive: {
    color: '#fff',
  },
});
