import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ChecklistTotals } from '../../api/checklist';
import { colors } from '../../theme';

type FilterKey = 'all' | 'identified' | 'missed' | 'unseen' | 'very_rare';

type Props = {
  totals: ChecklistTotals;
  activeFilter: FilterKey;
  onFilter: (key: FilterKey) => void;
  t: (key: string, fallback?: string) => string;
};

const CARDS: { key: FilterKey; labelKey: string; fallback: string; totalKey: keyof ChecklistTotals }[] = [
  { key: 'identified', labelKey: 'checklist_summary_seen', fallback: 'Seen', totalKey: 'identified' },
  { key: 'missed', labelKey: 'checklist_summary_missed', fallback: 'Missed', totalKey: 'missed' },
  { key: 'unseen', labelKey: 'checklist_summary_unseen', fallback: 'Unseen', totalKey: 'unseen' },
  { key: 'very_rare', labelKey: 'checklist_summary_very_rare', fallback: 'Very rare', totalKey: 'very_rare' },
];

export function ChecklistSummaryCards({ totals, activeFilter, onFilter, t }: Props) {
  const pct = (n: number) => (totals.all ? Math.round((100 * n) / totals.all) : 0);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CARDS.map((card) => {
        const count = totals[card.totalKey];
        const active = activeFilter === card.key;
        return (
          <TouchableOpacity
            key={card.key}
            style={[styles.card, active && styles.cardActive]}
            onPress={() => onFilter(card.key)}
          >
            <Text style={styles.count}>{count}</Text>
            <Text style={styles.pct}>{pct(count)}%</Text>
            <Text style={styles.label}>{t(card.labelKey, card.fallback)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, gap: 10, paddingVertical: 8 },
  card: {
    width: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: { borderColor: colors.primary[500] },
  count: { fontSize: 22, fontWeight: '800', color: colors.primary[800] },
  pct: { fontSize: 12, color: colors.primary[500], marginTop: 2 },
  label: { fontSize: 11, fontWeight: '600', color: colors.primary[700], marginTop: 6 },
});
