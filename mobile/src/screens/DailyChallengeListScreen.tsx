import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { listDailyChallenges, type DailyChallenge } from '../api/dailyChallenge';
import { colors } from '../theme';

export function DailyChallengeListScreen() {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setChallenges([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const list = await listDailyChallenges();
      setChallenges(list);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        (navigation as any).replace('Login');
        return;
      }
      setLoading(true);
      load();
    }, [isAuthenticated, load, navigation])
  );

  if (!isAuthenticated) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>Daily challenge</Text>
      <Text style={styles.hint}>Play a short quiz every day for 7 days. Compete with friends or play solo.</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => (navigation as any).navigate('DailyChallengeCreate')}
      >
        <Text style={styles.primaryButtonText}>New challenge</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>My challenges</Text>
      {loading && challenges.length === 0 ? (
        <ActivityIndicator size="small" color={colors.primary[500]} style={styles.loader} />
      ) : challenges.length === 0 ? (
        <Text style={styles.muted}>No challenges yet. Start one above.</Text>
      ) : (
        challenges.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={styles.card}
            onPress={() => (navigation as any).navigate('DailyChallengeDetail', { challengeId: c.id })}
          >
            <Text style={styles.cardTitle}>
              {c.country?.name ?? c.id} · {c.media} · {c.length} questions
            </Text>
            <Text style={styles.cardMeta}>
              {c.creator_username} · {c.status} · {c.participants?.length ?? 0} players
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 8 },
  hint: { fontSize: 14, color: colors.primary[600], marginBottom: 24 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryButtonText: { color: colors.primary[50], fontSize: 18, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.primary[800], marginBottom: 12 },
  loader: { marginVertical: 24 },
  muted: { fontSize: 14, color: colors.primary[600] },
  card: {
    backgroundColor: colors.primary[50],
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  cardMeta: { fontSize: 13, color: colors.primary[600], marginTop: 4 },
});
