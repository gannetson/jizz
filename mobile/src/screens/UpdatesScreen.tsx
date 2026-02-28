import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { loadUpdates, Update } from '../api/updates';
import { ReactionForm } from '../components/ReactionForm';
import { colors } from '../theme';

function formatDate(s: string) {
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return s;
  }
}

function UpdateCard({ update, onReactionPosted }: { update: Update; onReactionPosted?: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{update.title}</Text>
      </View>
      <Text style={styles.cardMessage}>{update.message}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardAuthor}>{update.user?.first_name ?? update.user?.username ?? 'Birdr'}</Text>
        <Text style={styles.cardDate}>{formatDate(update.created)}</Text>
      </View>
      <ReactionForm update={update} onReactionPosted={onReactionPosted} />
    </View>
  );
}

export function UpdatesScreen() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    loadUpdates()
      .then(setUpdates)
      .catch((e) => setError(e.message ?? 'Failed to load updates'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Updates</Text>
      {updates.length === 0 ? (
        <Text style={styles.emptyText}>No updates yet.</Text>
      ) : (
        updates.map((u) => (
          <UpdateCard
            key={u.id}
            update={u}
            onReactionPosted={load}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  screenTitle: { fontSize: 22, fontWeight: '600', color: colors.primary[800], marginBottom: 20 },
  errorText: { fontSize: 16, color: colors.error[500] },
  emptyText: { fontSize: 16, color: colors.primary[600] },
  card: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: colors.primary[200],
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.primary[800] },
  cardMessage: { fontSize: 15, color: colors.primary[800], padding: 14, lineHeight: 22 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  cardAuthor: { fontSize: 14, color: colors.primary[600] },
  cardDate: { fontSize: 14, fontStyle: 'italic', color: colors.primary[600] },
});
