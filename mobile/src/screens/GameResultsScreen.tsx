import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { useGameWebSocket } from '../context/GameWebSocketContext';
import { useTranslation } from '../i18n/TranslationContext';
import { colors } from '../theme';

export function GameResultsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const dailyChallengeId = (route.params as { dailyChallengeId?: number })?.dailyChallengeId;
  const { game, player, clearGame, setGame, loadGame } = useGame();
  const {
    players,
    joinGame,
    clearQuestion,
    sendRematch,
    rematchInvitation,
    clearRematchInvitation,
  } = useGameWebSocket();

  const [isRematchLoading, setIsRematchLoading] = useState(false);

  const isHost =
    players?.find((p) => p.is_host && (p.name === player?.name || p.id === player?.id)) !== undefined ||
    player?.name === (game?.host as { name?: string })?.name ||
    player?.id === (game?.host as { id?: number })?.id;

  const handlePlayAgain = async () => {
    // Replace so Results unmounts; defer clearGame so it runs after navigation commits (avoids "fewer hooks")
    (navigation as any).replace('Start');
    requestAnimationFrame(() => {
      clearGame();
    });
  };

  const handleBackToDailyChallenge = async () => {
    if (dailyChallengeId != null) {
      (navigation as any).replace('DailyChallengeDetail', { challengeId: dailyChallengeId });
    } else {
      (navigation as any).replace('Start');
    }
    requestAnimationFrame(() => {
      clearGame();
    });
  };

  const handleRematch = () => {
    if (!game || !player) return;
    setIsRematchLoading(true);
    sendRematch();
  };

  // When host receives rematch_invitation: close socket, clear state, load new game, replace to Lobby
  useEffect(() => {
    if (!rematchInvitation || !isHost || !player) return;
    const token = rematchInvitation.new_game_token;
    clearRematchInvitation(); // clear immediately so we don't run again
    const doJoin = async () => {
      joinGame(null, null, setGame);
      clearQuestion();
      await clearGame();
      const g = await loadGame(token);
      setIsRematchLoading(false);
      if (g) {
        setGame(g);
        (navigation as any).replace('Lobby');
      }
    };
    doJoin();
  }, [rematchInvitation?.new_game_token, isHost, player]);

  const handleJoinRematch = async () => {
    if (!rematchInvitation || !player) return;
    joinGame(null, null, setGame);
    clearQuestion();
    await clearGame();
    const g = await loadGame(rematchInvitation.new_game_token);
    clearRematchInvitation();
    if (g) {
      setGame(g);
      (navigation as any).replace('Lobby');
    }
  };

  const sortedPlayers = [...(players || [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

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
            style={[styles.outlineButton, isRematchLoading && styles.buttonDisabled]}
            onPress={handleRematch}
            disabled={isRematchLoading}
          >
            {isRematchLoading ? (
              <>
                <ActivityIndicator size="small" color={colors.primary[500]} style={styles.buttonSpinner} />
                <Text style={styles.outlineButtonText}>{t('creating_game')}</Text>
              </>
            ) : (
              <Text style={styles.outlineButtonText}>{t('rematch')}</Text>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.primaryButton} onPress={handlePlayAgain}>
          <Text style={styles.primaryButtonText}>{t('play_again')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 20 },
  list: { marginBottom: 24 },
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
