import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getMyGames, type UserGame } from '../api/myGames';
import { colors } from '../theme';

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { dateStyle: 'medium' }) + ' ' + d.toLocaleTimeString(undefined, { timeStyle: 'short' });
  } catch {
    return dateString;
  }
}

function getLevelLabel(level: string): string {
  const map: Record<string, string> = { beginner: 'Beginner', advanced: 'Advanced', expert: 'Expert' };
  return map[level] || level;
}

function getMediaLabel(media: string): string {
  const map: Record<string, string> = { images: 'Pictures', audio: 'Sounds', video: 'Videos' };
  return map[media] || media;
}

function GameRow({
  game,
  onPress,
}: {
  game: UserGame;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.gameCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.gameRow}>
        <View style={styles.gameMain}>
          <Text style={styles.gameCountry}>{game.country?.name ?? 'Unknown'}</Text>
          <Text style={styles.gameDate}>{formatDate(game.created)}</Text>
        </View>
        <View style={styles.gameScores}>
          {game.user_score != null && (
            <Text style={styles.gameScore}>{game.user_score} pts</Text>
          )}
          {game.correct_count != null && game.total_questions != null && (
            <Text style={styles.gameMeta}>{game.correct_count} / {game.total_questions} correct</Text>
          )}
          {game.ended && <Text style={styles.gameCompleted}>Completed</Text>}
        </View>
      </View>
      <View style={styles.gameTags}>
        <Text style={styles.tag}>Level: {getLevelLabel(game.level)}</Text>
        <Text style={styles.tagDot}>•</Text>
        <Text style={styles.tag}>Length: {game.length}</Text>
        <Text style={styles.tagDot}>•</Text>
        <Text style={styles.tag}>Media: {getMediaLabel(game.media)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function MyGamesScreen() {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Next page number to fetch (1 = first page; after first load we set to 2 if there's more) */
  const [nextPage, setNextPage] = useState(1);
  const [pagination, setPagination] = useState<{ count: number; next: string | null; previous: string | null } | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    const pageToFetch = isRefresh ? 1 : nextPage;
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      const data = await getMyGames(pageToFetch);
      setGames((prev) => (isRefresh || pageToFetch === 1 ? data.results : [...prev, ...data.results]));
      setPagination({ count: data.count, next: data.next, previous: data.previous });
      if (isRefresh) setNextPage(data.next ? 2 : 1);
      else if (data.next) setNextPage((p) => p + 1);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to load games';
      setError(msg);
      if (msg === 'Unauthorized' || msg?.includes('401')) {
        (navigation as any).replace('Login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [nextPage, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        (navigation as any).replace('Login');
        return;
      }
      load(true);
    }, [isAuthenticated, navigation, load])
  );

  const loadMore = useCallback(() => {
    if (pagination?.next && !loadingMore && !loading) load(false);
  }, [pagination?.next, loadingMore, loading, load]);

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>Redirecting to login…</Text>
      </View>
    );
  }

  if (loading && games.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>Loading games…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {games.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>You haven't played any games yet.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => (navigation as any).navigate('Start')}>
            <Text style={styles.primaryButtonText}>Start a game</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {pagination && (
            <Text style={styles.total}>Total: {pagination.count} games</Text>
          )}
          <FlatList
            data={games}
            keyExtractor={(item) => item.token}
            renderItem={({ item }) => (
              <GameRow
                game={item}
                onPress={() => (navigation as any).navigate('GameDetail', { token: item.token })}
              />
            )}
            contentContainerStyle={styles.list}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary[500]]} />
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: colors.primary[600], marginTop: 8 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, margin: 16, borderRadius: 8 },
  errorText: { fontSize: 14, color: colors.error[500] },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: colors.primary[600], marginBottom: 20, textAlign: 'center' },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  total: { fontSize: 14, color: colors.primary[600], marginHorizontal: 24, marginTop: 16, marginBottom: 8 },
  list: { padding: 24, paddingBottom: 100 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  gameCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  gameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  gameMain: { flex: 1 },
  gameCountry: { fontSize: 18, fontWeight: '700', color: colors.primary[800] },
  gameDate: { fontSize: 13, color: colors.primary[600], marginTop: 4 },
  gameScores: { alignItems: 'flex-end' },
  gameScore: { fontSize: 16, fontWeight: '600', color: colors.primary[600] },
  gameMeta: { fontSize: 13, color: colors.primary[600], marginTop: 2 },
  gameCompleted: { fontSize: 12, color: colors.primary[500], marginTop: 2 },
  gameTags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 12, gap: 4 },
  tag: { fontSize: 13, color: colors.primary[600] },
  tagDot: { fontSize: 13, color: colors.primary[400] },
});
