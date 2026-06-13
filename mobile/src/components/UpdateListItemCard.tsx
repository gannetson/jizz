import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { UpdateListItem } from '../api/updates';
import { colors } from '../theme';

function formatDate(s: string) {
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return s;
  }
}

type Props = {
  update: UpdateListItem;
  readMoreLabel: string;
  onPress: () => void;
  style?: object;
};

export function UpdateListItemCard({ update, readMoreLabel, onPress, style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {update.title}
        </Text>
        <Text style={styles.cardChevron}>›</Text>
      </View>
      <Text style={styles.cardExcerpt} numberOfLines={3}>
        {update.excerpt}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardAuthor}>{update.user?.first_name ?? update.user?.username}</Text>
        <Text style={styles.cardDate}>{formatDate(update.created)}</Text>
      </View>
      <View style={styles.cardActions}>
        {update.thumbs_up_count > 0 && (
          <Text style={styles.thumbsCount}>👍 {update.thumbs_up_count}</Text>
        )}
        <Text style={[styles.readMore, update.thumbs_up_count === 0 && styles.readMoreOnly]}>
          {readMoreLabel} →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[200],
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.primary[800] },
  cardChevron: { fontSize: 22, lineHeight: 24, color: colors.primary[700], marginLeft: 8 },
  cardExcerpt: { fontSize: 15, color: colors.primary[800], padding: 14, lineHeight: 22 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  cardAuthor: { fontSize: 14, color: colors.primary[600] },
  cardDate: { fontSize: 14, fontStyle: 'italic', color: colors.primary[600] },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.primary[100],
    marginTop: 12,
  },
  thumbsCount: { color: colors.primary[600], fontSize: 14 },
  readMore: {
    marginLeft: 'auto',
    color: colors.primary[700],
    fontSize: 14,
    fontWeight: '700',
  },
  readMoreOnly: { marginLeft: 0 },
});
