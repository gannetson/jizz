import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useGame } from '../context/GameContext';
import { useGameWebSocket } from '../context/GameWebSocketContext';
import { useTranslation } from '../i18n/TranslationContext';
import { API_BASE_URL } from '../api/config';
import { loadScores, type Score } from '../api/scores';
import { colors } from '../theme';

export function LobbyScreen() {
  const { t } = useTranslation();
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
  const [copied, setCopied] = useState(false);
  const [topScores, setTopScores] = useState<Score[]>([]);
  const isHost = player.name === (game.host as any)?.name || player.id === (game.host as any)?.id;

  useEffect(() => {
    if (!game) return;
    loadScores({
      level: game.level || undefined,
      length: game.length ? String(game.length) : undefined,
      media: game.media || undefined,
      country: game.country?.code || undefined,
    }).then((scores) => setTopScores(scores.slice(0, 3)));
  }, [game?.token]);

  const gameLink = `${API_BASE_URL}/join/${game.token}`;

  const copyLink = useCallback(async () => {
    await Clipboard.setStringAsync(gameLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [gameLink]);

  const inviteWhatsApp = useCallback(() => {
    const message = t('join_game_message', { link: gameLink });
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {});
  }, [gameLink, t]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Game Lobby</Text>
      <Text style={styles.hint}>
        {t('explain_mpg') || 'You can play against other players by sharing the game link. To play solo, start the game now.'}
      </Text>

      {!connected && (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
          <Text style={styles.connecting}> Connecting…</Text>
        </View>
      )}

      {/* Share section */}
      <Text style={styles.sectionTitle}>{t('share_game')}</Text>
      <View style={styles.shareCard}>
        <Text style={styles.shareLabel}>{t('game_link')}</Text>
        <View style={styles.linkBox}>
          <Text style={styles.linkText} selectable numberOfLines={1}>{gameLink}</Text>
        </View>

        <View style={styles.shareButtons}>
          <TouchableOpacity style={styles.copyButton} onPress={copyLink}>
            <Text style={styles.copyButtonText}>{copied ? t('copied') : t('copy_link')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.whatsappButton} onPress={inviteWhatsApp}>
            <Text style={styles.whatsappButtonText}>{t('invite_whatsapp')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.qrContainer}>
          <View style={styles.qrBox}>
            <QRCode
              value={gameLink}
              size={180}
              backgroundColor="#fff"
              color={colors.primary[800]}
            />
          </View>
          <Text style={styles.qrHint}>{t('scan_to_join')}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('players') || 'Players'} ({players.length})</Text>
      {players.length === 0 ? (
        <Text style={styles.muted}>No other players yet.</Text>
      ) : (
        players.map((p, i) => (
          <View key={i} style={styles.playerCard}>
            <View style={styles.playerLeft}>
              <View style={styles.playerAvatar}>
                <Text style={styles.playerAvatarText}>
                  {(p.name || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.playerName}>{p.name}</Text>
              {p.is_host && <Text style={styles.crown}>👑</Text>}
            </View>
            {p.score != null && p.score > 0 && (
              <Text style={styles.playerScore}>{p.score}</Text>
            )}
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

      {topScores.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('high_score') || 'High scores'}</Text>
          {topScores.map((s, i) => (
            <View key={`${s.ranking}-${s.name}-${i}`} style={styles.hsCard}>
              <Text style={styles.hsRank}>#{s.ranking}</Text>
              <View style={styles.hsCenter}>
                <Text style={styles.hsName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.hsMeta}>{s.level} · {s.length}q</Text>
              </View>
              <Text style={styles.hsScore}>{s.score}</Text>
            </View>
          ))}
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
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.primary[800], marginTop: 24, marginBottom: 10 },
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
  playerScore: { fontSize: 18, fontWeight: '700', color: colors.primary[700] },
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
  hsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
    padding: 14,
    marginBottom: 10,
  },
  hsRank: { fontSize: 16, fontWeight: '700', color: colors.primary[600], width: 36 },
  hsCenter: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  hsName: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  hsMeta: { fontSize: 13, color: colors.primary[600], marginTop: 2 },
  hsScore: { fontSize: 18, fontWeight: '700', color: colors.primary[700] },
  // Share section
  shareCard: {
    backgroundColor: colors.primary[50],
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  shareLabel: { fontSize: 13, fontWeight: '600', color: colors.primary[600], marginBottom: 6 },
  linkBox: {
    backgroundColor: '#fff',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginBottom: 12,
  },
  linkText: { fontSize: 14, color: colors.primary[800], fontFamily: undefined },
  shareButtons: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  copyButton: {
    flex: 1,
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  whatsappButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  qrContainer: { alignItems: 'center', marginTop: 4 },
  qrBox: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  qrHint: { fontSize: 13, color: colors.primary[500], marginTop: 8 },
});
