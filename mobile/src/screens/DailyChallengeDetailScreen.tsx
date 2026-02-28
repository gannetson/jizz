import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getDailyChallenge, getDailyChallengeRound, type DailyChallenge, type DailyChallengeRound } from '../api/dailyChallenge';
import { useGame } from '../context/GameContext';
import * as playerApi from '../api/player';
import { colors } from '../theme';

export function DailyChallengeDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const challengeId = (route.params as { challengeId?: number })?.challengeId;
  const { loadGame, setGame, setPlayer } = useGame();
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (challengeId == null) return;
    setError(null);
    try {
      const c = await getDailyChallenge(challengeId);
      setChallenge(c);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useFocusEffect(
    useCallback(() => {
      if (challengeId != null) {
        setLoading(true);
        load();
      }
    }, [challengeId, load])
  );

  const handlePlayRound = async (round: DailyChallengeRound & { game_token?: string | null; my_player_token?: string | null }) => {
    if (!round.game_token || !challengeId) return;
    setPlaying(true);
    setError(null);
    try {
      const roundData = await getDailyChallengeRound(challengeId, round.day_number);
      const myToken = roundData.my_player_token ?? (roundData as any).my_player_token;
      if (myToken) {
        const p = await playerApi.getPlayer(myToken);
        if (p) setPlayer(p);
      }
      const game = await loadGame(round.game_token);
      if (game) {
        setGame(game);
        const playerToken = roundData.my_player_token ?? (roundData as any).my_player_token;
        (navigation as any).navigate('GamePlay', {
          dailyChallengeId: challengeId,
          gameToken: round.game_token,
          playerToken: playerToken ?? undefined,
        });
      } else {
        setError('Could not load game');
      }
    } catch {
      setError('Could not load game');
    } finally {
      setPlaying(false);
    }
  };

  const handleOpenRoundReview = (gameToken: string) => {
    (navigation as any).navigate('GameDetail', { token: gameToken });
  };

  if (challengeId == null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>No challenge selected</Text>
      </View>
    );
  }

  if (loading && !challenge) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error && !challenge) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!challenge) return null;

  const currentRound = challenge.rounds?.find((r) => r.status === 'active');
  const rounds = challenge.rounds ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>{challenge.country?.name ?? 'Challenge'} · Day {rounds.length}</Text>
      <Text style={styles.meta}>
        {challenge.creator_username} · {challenge.media} · {challenge.length} questions · {challenge.status}
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Rounds</Text>
      {rounds.map((r) => {
        const isCompleted = Boolean(r.game_ended && r.user_score != null);
        const isPlayable = r.status === 'active' && r.game_token && !isCompleted;
        const isReviewable = isCompleted && r.game_token;

        const cardContent = (
          <>
            <View style={styles.roundCardHeader}>
              <Text style={styles.roundTitle}>Day {r.day_number}</Text>
              {r.user_score != null && (
                <Text style={styles.roundScore}>{r.user_score} pts</Text>
              )}
            </View>
            <Text style={styles.roundMeta}>
              {r.status} · closes {r.closes_at ? new Date(r.closes_at).toLocaleString() : ''}
            </Text>
            {isPlayable && (
              <TouchableOpacity
                style={[styles.playButton, playing && styles.playButtonDisabled]}
                onPress={() => handlePlayRound(r)}
                disabled={playing}
              >
                {playing ? (
                  <ActivityIndicator size="small" color={colors.primary[50]} />
                ) : (
                  <Text style={styles.playButtonText}>Play</Text>
                )}
              </TouchableOpacity>
            )}
            {isReviewable && (
              <Text style={styles.viewResultsHint}>Tap to view right and wrong answers</Text>
            )}
          </>
        );

        return (
          <View
            key={r.id}
            style={[
              styles.roundCard,
              r.status === 'active' && !isCompleted && styles.roundCardActive,
              isCompleted && styles.roundCardCompleted,
            ]}
          >
            {isReviewable ? (
              <Pressable onPress={() => handleOpenRoundReview(r.game_token!)} style={styles.roundCardPressable}>
                {cardContent}
              </Pressable>
            ) : (
              cardContent
            )}
          </View>
        );
      })}

      {currentRound && !currentRound.game_token && (
        <Text style={styles.muted}>Today&apos;s round is not ready yet.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 4 },
  meta: { fontSize: 14, color: colors.primary[600], marginBottom: 24 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.primary[800], marginBottom: 12 },
  roundCard: {
    backgroundColor: colors.primary[50],
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  roundCardActive: { borderColor: colors.primary[500], borderWidth: 2 },
  roundCardCompleted: {
    borderColor: colors.success[500],
    backgroundColor: colors.success[50],
    borderWidth: 2,
  },
  roundCardPressable: { flex: 1 },
  roundCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roundTitle: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  roundScore: { fontSize: 16, fontWeight: '600', color: colors.primary[700] },
  roundMeta: { fontSize: 13, color: colors.primary[600], marginTop: 4 },
  playButton: {
    marginTop: 12,
    backgroundColor: colors.primary[500],
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  playButtonDisabled: { opacity: 0.8 },
  playButtonText: { color: colors.primary[50], fontWeight: '600' },
  viewResultsHint: { fontSize: 12, color: colors.primary[600], marginTop: 8 },
  muted: { fontSize: 14, color: colors.primary[600], marginTop: 8 },
});
