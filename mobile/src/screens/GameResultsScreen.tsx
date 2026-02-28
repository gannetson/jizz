import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
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
  const { game, clearGame } = useGame();
  const { players } = useGameWebSocket();

  const handlePlayAgain = async () => {
    await clearGame();
    (navigation as any).navigate('Start');
  };

  const handleBackToDailyChallenge = async () => {
    await clearGame();
    if (dailyChallengeId != null) {
      (navigation as any).navigate('DailyChallengeDetail', { challengeId: dailyChallengeId });
    } else {
      (navigation as any).navigate('Start');
    }
  };

  const sortedPlayers = [...(players || [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('final_results')}</Text>
      <View style={styles.list}>
        {sortedPlayers.length === 0 ? (
          <Text style={styles.muted}>{t('no_scores_yet')}</Text>
        ) : (
          sortedPlayers.map((p, i) => (
            <View key={i} style={styles.playerRow}>
              <Text style={styles.rank}>{i + 1}.</Text>
              <Text style={styles.playerName}>{p.name}</Text>
              <Text style={styles.playerScore}>{p.score ?? 0}</Text>
            </View>
          ))
        )}
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={dailyChallengeId != null ? handleBackToDailyChallenge : handlePlayAgain}>
        <Text style={styles.primaryButtonText}>
          {dailyChallengeId != null ? (t('back_to_daily_challenge') || 'Back to Daily Challenge') : t('play_again')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 20 },
  list: { marginBottom: 24 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.primary[200] },
  rank: { fontSize: 16, color: colors.primary[600], width: 28 },
  playerName: { flex: 1, fontSize: 16, color: colors.primary[800] },
  playerScore: { fontSize: 18, fontWeight: '700', color: colors.primary[700] },
  muted: { fontSize: 14, color: colors.primary[500], fontStyle: 'italic' },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
});
