import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { useGameWebSocket } from '../context/GameWebSocketContext';
import { colors } from '../theme';

export function LobbyScreen() {
  const navigation = useNavigation();
  const { game, player, setGame, loadGame: loadGameFromApi } = useGame();
  const { players, question, startGame, joinGame, connected } = useGameWebSocket();

  useEffect(() => {
    if (!game?.token || !player?.token) return;
    joinGame(game, player, setGame);
    return () => {};
  }, [game?.token, player?.token]);

  useEffect(() => {
    if (game?.token) {
      loadGameFromApi(game.token).then((g) => g && setGame(g));
    }
  }, [game?.token]);

  useEffect(() => {
    if (question && game?.token && question.game?.token === game.token) {
      (navigation as any).navigate('GamePlay');
    }
  }, [question, game?.token, navigation]);

  if (!game || !player) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No game or player. Start a game from the Start screen.</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Start')}>
          <Text style={styles.buttonText}>Go to Start</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [starting, setStarting] = useState(false);
  const isHost = player.name === (game.host as any)?.name || player.id === (game.host as any)?.id;
  const gameLength = typeof game.length === 'number' ? game.length : parseInt(String(game.length), 10) || 10;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Game Lobby</Text>
      <Text style={styles.hint}>
        You can play against other players by sharing the game link. To play solo, start the game now.
      </Text>
      {!connected && (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
          <Text style={styles.connecting}> Connecting…</Text>
        </View>
      )}
      <Text style={styles.sectionTitle}>Players joined</Text>
      {players.length === 0 ? (
        <Text style={styles.muted}>No other players yet.</Text>
      ) : (
        players.map((p, i) => (
          <View key={i} style={styles.playerRow}>
            <Text style={styles.playerName}>{p.name}{p.is_host ? ' (host)' : ''}</Text>
          </View>
        ))
      )}
      <View style={styles.actions}>
        {isHost ? (
          <TouchableOpacity
            style={[styles.primaryButton, starting && styles.primaryButtonDisabled]}
            onPress={() => { setStarting(true); startGame(); }}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator size="small" color={colors.primary[50]} />
            ) : (
              <Text style={styles.primaryButtonText}>Start game</Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text style={styles.muted}>Waiting for host to start the game.</Text>
        )}
      </View>
      {game.current_highscore && (
        <>
          <Text style={styles.sectionTitle}>Current high score</Text>
          <Text style={styles.highScore}>{game.current_highscore.name}: {game.current_highscore.score ?? 0}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 12 },
  hint: { fontSize: 14, color: colors.primary[600], marginBottom: 20 },
  connecting: { fontSize: 14, color: colors.primary[600] },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.primary[800], marginTop: 16, marginBottom: 8 },
  playerRow: { paddingVertical: 8, paddingHorizontal: 0 },
  playerName: { fontSize: 16, color: colors.primary[800] },
  muted: { fontSize: 14, color: colors.primary[500], fontStyle: 'italic' },
  actions: { marginTop: 24 },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  button: { marginTop: 16, paddingVertical: 12 },
  buttonText: { fontSize: 16, color: colors.primary[500] },
  errorText: { fontSize: 16, color: colors.error[500], textAlign: 'center', marginBottom: 12 },
  highScore: { fontSize: 16, color: colors.primary[700] },
});
