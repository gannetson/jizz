import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../i18n/TranslationContext';
import {
  getFlock,
  getFlockChallengeLeaderboard,
  flockChallengeShareUrl,
  buildFlockLeaderboardShareMessage,
  type Flock,
  type FlockLeaderboard,
  type FlockLeaderboardEntry,
} from '../api/flocks';
import { colors } from '../theme';
import { getFlockImage } from '../constants/birdrFlockImages';
import { GameArtImage } from '../components/GameArtImage';
import { useVisualStyle } from '../context/VisualStyleContext';

function LeaderboardRow({
  entry,
  highlight,
  t,
}: {
  entry: FlockLeaderboardEntry;
  highlight?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <View style={[styles.lbRow, highlight && styles.lbRowHighlight]}>
      <Text style={styles.lbRank}>#{entry.rank}</Text>
      <View style={styles.lbCenter}>
        <Text style={styles.lbName} numberOfLines={1}>
          {entry.display_name}
        </Text>
        <Text style={styles.lbMeta}>{entry.score_label}</Text>
      </View>
      {highlight ? <Text style={styles.lbYou}>{t('you')}</Text> : null}
    </View>
  );
}

export function FlockLeaderboardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { slug, challengeId } = (route.params as { slug?: string; challengeId?: number }) ?? {};
  const { t, locale } = useTranslation();
  const { visualStyle } = useVisualStyle();
  const [flock, setFlock] = useState<Flock | null>(null);
  const [board, setBoard] = useState<FlockLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug || !challengeId) return;
    setError(null);
    try {
      const [f, lb] = await Promise.all([
        getFlock(slug),
        getFlockChallengeLeaderboard(slug, challengeId),
      ]);
      setFlock(f);
      setBoard(lb);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
    } finally {
      setLoading(false);
    }
  }, [slug, challengeId, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const challenge =
    flock?.active_challenge?.id === challengeId ? flock.active_challenge : null;
  const meId = board?.me?.user_id;

  const handleShareLeaderboard = useCallback(async () => {
    if (!flock || !challenge) return;
    const shareUrl = flockChallengeShareUrl(challenge);
    if (!shareUrl) return;
    const message = buildFlockLeaderboardShareMessage(
      {
        flockName: flock.name,
        challengeTitle: challenge.title,
        shareUrl,
      },
      locale
    );
    try {
      await Share.share({ message, url: shareUrl });
    } catch {
      // cancelled
    }
  }, [flock, challenge, locale]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>{t('flock_leaderboard')}</Text>
      {flock ? <Text style={styles.meta}>{flock.name}</Text> : null}
      {challenge ? <Text style={styles.challenge}>{challenge.title}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {challenge?.public_token ? (
        <TouchableOpacity style={styles.shareButton} onPress={() => void handleShareLeaderboard()}>
          <Text style={styles.shareButtonText}>{t('flock_share_leaderboard')}</Text>
        </TouchableOpacity>
      ) : null}

      <GameArtImage source={getFlockImage('leaderboard', visualStyle)} style={styles.heroImage} resizeMode="contain" />

      {loading && !board ? (
        <ActivityIndicator size="small" color={colors.primary[500]} />
      ) : board ? (
        <>
          {board.top.length === 0 ? (
            <Text style={styles.meta}>{t('flock_no_scores_yet')}</Text>
          ) : (
            board.top.map((entry) => (
              <TouchableOpacity
                key={`${entry.rank}-${entry.user_id}`}
                onPress={() => {
                  if (entry.result_token) {
                    (navigation as any).navigate('FlockChallengeResult', {
                      resultToken: entry.result_token,
                      flockSlug: slug,
                    });
                  }
                }}
              >
                <LeaderboardRow entry={entry} highlight={entry.user_id === meId} t={t} />
              </TouchableOpacity>
            ))
          )}
          {board.me && board.me.rank > 10 ? (
            <>
              <Text style={styles.ellipsis}>…</Text>
              {(board.neighbours.length ? board.neighbours : [board.me]).map((entry) => (
                <LeaderboardRow
                  key={`n-${entry.rank}-${entry.user_id}`}
                  entry={entry}
                  highlight={entry.user_id === meId}
                  t={t}
                />
              ))}
            </>
          ) : null}
        </>
      ) : null}

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => (navigation as any).navigate('FlockDetail', { slug })}
      >
        <Text style={styles.linkButtonText}>{t('back_to_flock')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 4 },
  meta: { fontSize: 14, color: colors.primary[600], marginBottom: 4 },
  challenge: { fontSize: 16, fontWeight: '600', color: colors.primary[800], marginBottom: 12 },
  shareButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  shareButtonText: { color: colors.primary[700], fontSize: 14, fontWeight: '600' },
  heroImage: { width: '100%', maxWidth: 240, height: 150, alignSelf: 'center', marginBottom: 16 },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    gap: 12,
  },
  lbRowHighlight: { backgroundColor: colors.primary[50] },
  lbRank: { width: 36, fontWeight: '700', color: colors.primary[700] },
  lbCenter: { flex: 1 },
  lbName: { fontSize: 15, fontWeight: '600', color: colors.primary[800] },
  lbMeta: { fontSize: 13, color: colors.primary[600] },
  lbYou: { fontSize: 12, fontWeight: '700', color: colors.primary[500] },
  ellipsis: { textAlign: 'center', color: colors.primary[400], marginVertical: 8 },
  errorText: { color: colors.error[500], marginBottom: 12 },
  linkButton: { alignItems: 'center', marginTop: 24 },
  linkButtonText: { color: colors.primary[500], fontWeight: '600' },
});
