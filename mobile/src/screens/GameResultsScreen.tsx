import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, InteractionManager } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { useGameWebSocket } from '../context/GameWebSocketContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import { colors } from '../theme';
import type { Game } from '../api/games';
import type { MultiPlayer } from '../types/game';
import type { Player } from '../api/player';

const REMATCH_TIMEOUT_MS = 20000;

function formatGameDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return (
      d.toLocaleDateString(undefined, { dateStyle: 'medium' }) +
      ' ' +
      d.toLocaleTimeString(undefined, { timeStyle: 'short' })
    );
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

function getMpgResultsStats(game: Game, player: Player | null, players: MultiPlayer[]) {
  const me = players.find((p) => p.id === player?.id);
  const userScore = me?.score;
  const scoreRow = game.scores?.find((s) => s.name === player?.name);
  const answers = scoreRow?.answers ?? [];
  const correctCount = answers.filter((a) => a.correct === true).length;
  const len = typeof game.length === 'string' ? parseInt(game.length, 10) : Number(game.length);
  const totalQuestions = Number.isFinite(len) && len > 0 ? len : answers.length;
  return {
    userScore: userScore ?? scoreRow?.score,
    correctCount,
    totalQuestions,
  };
}

export function GameResultsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const dailyChallengeId = (route.params as { dailyChallengeId?: number })?.dailyChallengeId;
  const { isAuthenticated } = useAuth();
  const { game, player, clearGame, setGame, loadGame } = useGame();
  const {
    players,
    joinGame,
    clearQuestion,
    sendRematch,
    rematchInvitation,
    rematchError,
    clearRematchInvitation,
    clearRematchError,
  } = useGameWebSocket();

  const [isRematchLoading, setIsRematchLoading] = useState(false);
  const [rematchTimeoutMessage, setRematchTimeoutMessage] = useState<string | null>(null);
  const rematchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHost =
    players?.find((p) => p.is_host && (p.name === player?.name || p.id === player?.id)) !== undefined ||
    player?.name === (game?.host as { name?: string })?.name ||
    player?.id === (game?.host as { id?: number })?.id;

  const handlePlayAgain = () => {
    (navigation as any).replace('Start');
    // Run clearGame after navigation and unmount complete to avoid "Rendered fewer hooks than expected"
    InteractionManager.runAfterInteractions(() => {
      clearGame();
    });
  };

  const handleBackToDailyChallenge = () => {
    if (dailyChallengeId != null) {
      (navigation as any).replace('DailyChallengeDetail', { challengeId: dailyChallengeId });
    } else {
      (navigation as any).replace('Start');
    }
    InteractionManager.runAfterInteractions(() => {
      clearGame();
    });
  };

  const handleRematch = () => {
    if (!game || !player) return;
    clearRematchError();
    setRematchTimeoutMessage(null);
    setIsRematchLoading(true);
    if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
    rematchTimeoutRef.current = setTimeout(() => {
      rematchTimeoutRef.current = null;
      setIsRematchLoading(false);
      setRematchTimeoutMessage(t('rematch_timeout') || 'Request timed out. Try again.');
    }, REMATCH_TIMEOUT_MS);
    sendRematch();
  };

  // Clear loading when we get an error from backend
  useEffect(() => {
    if (rematchError) {
      setRematchTimeoutMessage(null);
      setIsRematchLoading(false);
      if (rematchTimeoutRef.current) {
        clearTimeout(rematchTimeoutRef.current);
        rematchTimeoutRef.current = null;
      }
    }
  }, [rematchError]);

  // When host receives rematch_invitation: close socket, clear state, load new game, replace to Lobby
  useEffect(() => {
    if (!rematchInvitation || !isHost || !player) return;
    if (rematchTimeoutRef.current) {
      clearTimeout(rematchTimeoutRef.current);
      rematchTimeoutRef.current = null;
    }
    const token = rematchInvitation.new_game_token;
    clearRematchInvitation();
    clearRematchError();
    setRematchTimeoutMessage(null);
    const doJoin = async () => {
      joinGame(null, null, setGame);
      clearQuestion();
      const g = await loadGame(token);
      setIsRematchLoading(false);
      if (g) {
        await new Promise((r) => setTimeout(r, 200));
        (navigation as any).replace('Lobby', { rematch_game_token: token, rematchJoin: true });
      }
    };
    doJoin();
  }, [rematchInvitation?.new_game_token, isHost, player]);

  useEffect(() => {
    return () => {
      if (rematchTimeoutRef.current) clearTimeout(rematchTimeoutRef.current);
    };
  }, []);

  const handleGameDetails = () => {
    if (!game?.token) return;
    if (isAuthenticated) {
      (navigation as any).navigate('GameDetail', { token: game.token });
      return;
    }
    if (!player?.token) return;
    (navigation as any).navigate('GameDetail', {
      token: game.token,
      playerToken: player.token,
    });
  };

  const handleJoinRematch = async () => {
    if (!rematchInvitation || !player) return;
    joinGame(null, null, setGame);
    clearQuestion();
    const newToken = rematchInvitation.new_game_token;
    clearRematchInvitation();
    const g = await loadGame(newToken);
    if (g) {
      // Wait for context to update so LobbyScreen mounts with the new game (not the old one)
      await new Promise((r) => setTimeout(r, 200));
      (navigation as any).replace('Lobby', { rematch_game_token: newToken, rematchJoin: true });
    }
  };

  const sortedPlayers = [...(players || [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const resultsStats = useMemo(() => {
    if (!game) return null;
    return getMpgResultsStats(game, player, players || []);
  }, [game, player, players]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="gameResults.screen" accessibilityLabel="Game results">
      <Text style={styles.title} accessibilityLabel="Final results">{t('final_results')}</Text>
      <View style={styles.list}>
        {sortedPlayers.length === 0 ? (
          <Text style={styles.muted}>{t('no_scores_yet')}</Text>
        ) : (
          sortedPlayers.map((p, i) => (
            <View key={i} style={styles.playerCard}>
              <View style={styles.playerLeft}>
                <View style={styles.playerAvatar}>
                  <Text style={styles.playerAvatarText}>
                    {(p.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.playerName}>{p.name}</Text>
                {p.is_host ? <Text style={styles.crown}>👑</Text> : null}
              </View>
              <View style={styles.playerScores}>
                {p.ranking != null && (
                  <View style={styles.scoreTag}>
                    <Text style={styles.scoreTagText}>#{p.ranking} {t('high_score')}</Text>
                  </View>
                )}
                <View style={styles.scoreTotal}>
                  <Text style={styles.scoreTotalText}>{p.score ?? 0}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
      {(rematchError || rematchTimeoutMessage) ? (
          <Text style={styles.errorText} testID="gameResults.rematchError">{rematchError || rematchTimeoutMessage}</Text>
        ) : null}
      {game?.token && (isAuthenticated || player?.token) && resultsStats ? (
        <View style={styles.gameDetailsSection}>
          <Text style={styles.sectionTitle}>{t('review_answers')}</Text>
          <TouchableOpacity
            style={styles.gameDetailsCard}
            onPress={handleGameDetails}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityHint={t('tap_for_game_details')}
            accessibilityLabel={t('game_details')}
            testID="gameResults.gameDetails"
          >
            <View style={styles.gameDetailsRow}>
              <View style={styles.gameDetailsMain}>
                <Text style={styles.gameCountry}>{game.country?.name ?? '—'}</Text>
                <Text style={styles.gameDate}>{formatGameDate(game.created)}</Text>
              </View>
              <View style={styles.gameDetailsRight}>
                <View style={styles.gameDetailsScores}>
                  {resultsStats.userScore != null && (
                    <Text style={styles.gameScore}>{resultsStats.userScore} pts</Text>
                  )}
                  {resultsStats.totalQuestions > 0 && (
                    <Text style={styles.gameMeta}>
                      {resultsStats.correctCount} / {resultsStats.totalQuestions} correct
                    </Text>
                  )}
                </View>
                <Text style={styles.chevron} accessible={false}>
                  ›
                </Text>
              </View>
            </View>
            <View style={styles.gameTags}>
              <Text style={styles.tag}>Level: {getLevelLabel(game.level)}</Text>
              <Text style={styles.tagDot}>•</Text>
              <Text style={styles.tag}>Length: {game.length}</Text>
              <Text style={styles.tagDot}>•</Text>
              <Text style={styles.tag}>Media: {getMediaLabel(game.media)}</Text>
            </View>
            <Text style={styles.tapHint}>{t('tap_for_game_details')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.buttons}>
        {dailyChallengeId != null && (
          <TouchableOpacity style={styles.outlineButton} onPress={handleBackToDailyChallenge}>
            <Text style={styles.outlineButtonText}>{t('back_to_daily_challenge') || 'Back to Daily Challenge'}</Text>
          </TouchableOpacity>
        )}
        {rematchInvitation != null && (
          <TouchableOpacity style={styles.primaryButton} onPress={handleJoinRematch}>
            <Text style={styles.primaryButtonText}>{t('join_rematch')}</Text>
          </TouchableOpacity>
        )}
        {isHost && (
          <TouchableOpacity
            style={[styles.primaryButton, isRematchLoading && styles.buttonDisabled]}
            onPress={handleRematch}
            disabled={isRematchLoading}
          >
            {isRematchLoading ? (
              <>
                <ActivityIndicator size="small" color={colors.primary[500]} style={styles.buttonSpinner} />
                <Text style={styles.primaryButtonText}>{t('creating_game')}</Text>
              </>
            ) : (
              <Text style={styles.primaryButtonText}>{t('rematch')}</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.outlineButton} onPress={handlePlayAgain}>
          <Text style={styles.outlineButtonText}>{t('play_again')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 20 },
  errorText: { fontSize: 14, color: colors.error[500], marginBottom: 12 },
  list: { marginBottom: 24 },
  gameDetailsSection: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 12,
  },
  gameDetailsCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.primary[200],
    borderRadius: 8,
    padding: 16,
  },
  gameDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  gameDetailsMain: { flex: 1, paddingRight: 8 },
  gameCountry: { fontSize: 18, fontWeight: '700', color: colors.primary[800] },
  gameDate: { fontSize: 13, color: colors.primary[600], marginTop: 4 },
  gameDetailsRight: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  gameDetailsScores: { alignItems: 'flex-end' },
  gameScore: { fontSize: 16, fontWeight: '600', color: colors.primary[600] },
  gameMeta: { fontSize: 13, color: colors.primary[600], marginTop: 2 },
  chevron: { fontSize: 28, color: colors.primary[400], lineHeight: 30, marginTop: 0 },
  gameTags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 12, gap: 4 },
  tag: { fontSize: 13, color: colors.primary[600] },
  tagDot: { fontSize: 13, color: colors.primary[400] },
  tapHint: { fontSize: 14, fontWeight: '500', color: colors.primary[500], marginTop: 12 },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: colors.primary[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  playerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  playerName: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  crown: { fontSize: 14 },
  playerScores: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primary[200],
  },
  scoreTagText: { fontSize: 12, color: colors.primary[800] },
  scoreTotal: { minWidth: 36, alignItems: 'flex-end' },
  scoreTotalText: { fontSize: 18, fontWeight: '700', color: colors.primary[700] },
  muted: { fontSize: 14, color: colors.primary[500], fontStyle: 'italic' },
  buttons: { gap: 12 },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  outlineButtonText: { fontSize: 16, fontWeight: '600', color: colors.primary[500] },
  buttonDisabled: { opacity: 0.7 },
  buttonSpinner: { marginRight: 8 },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
});
