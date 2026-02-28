import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import type { Reaction } from '../api/updates';

function formatDate(s: string | undefined) {
  if (!s) return '';
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return s;
  }
}

export function ReactionLine({ reaction }: { reaction: Reaction }) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{reaction.message}</Text>
      <View style={styles.footer}>
        <Text style={styles.name}>{reaction.name ?? 'Anonymous'}</Text>
        <Text style={styles.date}>{formatDate(reaction.created)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[200],
    paddingLeft: 16,
    marginLeft: 8,
    marginVertical: 6,
  },
  message: { fontSize: 15, color: colors.primary[800], paddingVertical: 4 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  name: { fontSize: 14, color: colors.primary[600] },
  date: { fontSize: 14, fontStyle: 'italic', color: colors.primary[600] },
});
