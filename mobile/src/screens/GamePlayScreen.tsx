import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Video, Audio } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { useGameWebSocket } from '../context/GameWebSocketContext';
import { useTranslation } from '../i18n/TranslationContext';
import { AnswerFeedback } from '../components/AnswerFeedback';
import { MediaCredits } from '../components/MediaCredits';
import { FlagMediaModal, type FlagMediaInfo } from '../components/FlagMediaModal';
import { SpeciesMediaModal, type SpeciesMediaData } from '../components/SpeciesMediaModal';
import { SpeciesViewButton } from '../components/SpeciesViewButton';
import { apiUrl } from '../api/config';
import { getSpeciesForCountry } from '../api/species';
import { colors } from '../theme';
import { usePulsatingAnimation } from '../hooks/usePulsatingAnimation';
import type { Species } from '../types/game';
import * as playerApi from '../api/player';

function speciesDisplayName(s: Species, lang?: string): string {
  if (s.name_translated) return s.name_translated;
  if (lang === 'nl' && s.name_nl) return s.name_nl;
  if (lang === 'la' && s.name_latin) return s.name_latin;
  return s.name || s.name_latin || `Species ${s.id}`;
}

export function GamePlayScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const dailyChallengeId = (route.params as { dailyChallengeId?: number })?.dailyChallengeId;
  const gameTokenParam = (route.params as { gameToken?: string })?.gameToken;
  const playerTokenParam = (route.params as { playerToken?: string })?.playerToken;
  const { game, player, setGame, setPlayer, loadGame } = useGame();
  const { question, answer, players, nextQuestion, submitAnswer, joinGame, startGame, connected } = useGameWebSocket();
  const dailyChallengeStartSent = useRef(false);
  const [dailyChallengeLoadTimeout, setDailyChallengeLoadTimeout] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [expertSpecies, setExpertSpecies] = useState<Species[]>([]);
  const [expertQuery, setExpertQuery] = useState('');
  const [mediaIndex, setMediaIndex] = useState<number>(0);
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [flagMediaInfo, setFlagMediaInfo] = useState<FlagMediaInfo | null>(null);
  const [imageError, setImageError] = useState(false);
  const [mediaSpecies, setMediaSpecies] = useState<SpeciesMediaData | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [soundPlaying, setSoundPlaying] = useState(false);

  const pulsatingStyle = usePulsatingAnimation(soundPlaying);
  const lang = game?.language || (player as any)?.language;

  // When coming from daily challenge with gameToken/playerToken in params, ensure we have game and player (context may not have updated yet)
  const dailyLoadCancelled = useRef(false);
  useEffect(() => {
    if (!gameTokenParam) return;
    if (game?.token === gameTokenParam && (!playerTokenParam || player?.token === playerTokenParam)) return;
    dailyLoadCancelled.current = false;
    (async () => {
      const g = await loadGame(gameTokenParam);
      if (dailyLoadCancelled.current || !g) return;
      setGame(g);
      if (playerTokenParam) {
        const p = await playerApi.getPlayer(playerTokenParam);
        if (!dailyLoadCancelled.current && p) setPlayer(p);
      }
    })();
    return () => { dailyLoadCancelled.current = true; };
  }, [gameTokenParam, playerTokenParam, loadGame, setGame, setPlayer]);

  useEffect(() => {
    if (answer) {
      setShowFeedback(true);
      setSubmittingId(null);
    }
  }, [answer]);

  useEffect(() => {
    if (game?.ended) {
      (navigation as any).navigate('GameResults', { dailyChallengeId });
    }
  }, [game?.ended, navigation, dailyChallengeId]);

  useEffect(() => {
    if (question) setMediaIndex(question.sequence ?? 0);
  }, [question?.id]);

  // When playing daily challenge we skip lobby: join WebSocket and (if host) start game from here
  useEffect(() => {
    if (dailyChallengeId && game?.token && player?.token) {
      joinGame(game, player, setGame);
    }
  }, [dailyChallengeId, game?.token, player?.token, joinGame, setGame]);

  useEffect(() => {
    if (dailyChallengeId && connected && !question && game && player) {
      const isHost = player.name === (game.host as any)?.name || player.id === (game.host as any)?.id;
      if (isHost && !dailyChallengeStartSent.current) {
        dailyChallengeStartSent.current = true;
        startGame();
      }
    }
  }, [dailyChallengeId, connected, question, game, player, startGame]);

  // If we're in daily challenge and waiting for first question, show error after timeout so we don't hang
  useEffect(() => {
    if (!dailyChallengeId || question || !game || !player) return;
    setDailyChallengeLoadTimeout(false);
    const t = setTimeout(() => setDailyChallengeLoadTimeout(true), 20000);
    return () => clearTimeout(t);
  }, [dailyChallengeId, question, game, player]);

  useEffect(() => {
    if (!question || game?.level !== 'expert') return;
    const countryCode = (game as any).country?.code;
    if (!countryCode) return;
    const language = game?.language || (player as any)?.language || 'en';
    getSpeciesForCountry(countryCode, language).then(setExpertSpecies);
  }, [question?.id, game?.level, game?.language, (game as any)?.country?.code, (player as any)?.language]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [question?.id]);

  useEffect(() => {
    setExpertQuery('');
    setSubmittingId(null);
  }, [question?.id]);

  useEffect(() => {
    setImageError(false);
  }, [question?.id, mediaIndex]);

  useEffect(() => {
    setSoundPlaying(false);
  }, [question?.id, mediaIndex]);

  if (!game || !player) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>{t('no_game')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Start')}>
          <Text style={styles.link}>{t('start')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gameLength = typeof game.length === 'number' ? game.length : parseInt(String(game.length), 10) || 10;
  const isHost = player.name === (game.host as any)?.name || player.id === (game.host as any)?.id;
  const done = gameLength <= (question?.sequence ?? 0);

  const handleEndGame = () => {
    (navigation as any).navigate('GameResults', { dailyChallengeId });
  };

  const handleNext = () => {
    setShowFeedback(false);
    nextQuestion();
  };

  const handleAnswer = (option: Species) => {
    if (!question || answer || submittingId !== null) return;
    setSubmittingId(option.id);
    setShowFeedback(false);
    submitAnswer({ question, answer: option });
  };

  const mediaType = game.media || 'images';
  const currentIndex = mediaIndex;
  const image = mediaType === 'images' && question?.images?.[currentIndex];
  const video = mediaType === 'video' && question?.videos?.[currentIndex];
  const sound = mediaType === 'audio' && question?.sounds?.[currentIndex];
  const imageUri = image?.url
    ? (image.url.startsWith('http') ? image.url : apiUrl(image.url)).replace('/1800', '/900')
    : null;
  const videoUri = video?.url ? (video.url.startsWith('http') ? video.url : apiUrl(video.url)) : null;
  const soundUri = sound?.url ? (sound.url.startsWith('http') ? sound.url : apiUrl(sound.url)) : null;

  const playSound = useCallback(async () => {
    if (!soundUri) return;
    try {
      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound: s } = await Audio.Sound.createAsync({ uri: soundUri });
      s.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) setSoundPlaying(false);
      });
      soundRef.current = s;
      await s.playAsync();
      setSoundPlaying(true);
    } catch (_) {}
  }, [soundUri]);

  const openFlagModal = () => {
    if (!question || !game) return;
    let mediaData: FlagMediaInfo | null = null;
    if (mediaType === 'images' && question.images?.[currentIndex]) {
      const item = question.images[currentIndex];
      mediaData = {
        id: item.id!,
        type: 'image',
        url: item.url,
        link: item.link,
        contributor: item.contributor,
        index: currentIndex,
      };
    } else if (mediaType === 'video' && question.videos?.[currentIndex]) {
      const item = question.videos[currentIndex];
      mediaData = {
        id: item.id!,
        type: 'video',
        url: item.url,
        link: item.link,
        contributor: item.contributor,
        index: currentIndex,
      };
    } else if (mediaType === 'audio' && question.sounds?.[currentIndex]) {
      const item = question.sounds[currentIndex];
      mediaData = {
        id: item.id!,
        type: 'audio',
        url: item.url,
        link: item.link,
        contributor: item.contributor,
        index: currentIndex,
      };
    }
    if (mediaData) {
      setFlagMediaInfo(mediaData);
      setFlagModalVisible(true);
    }
  };

  const onFlagSuccess = () => {
    if (!question || !game) return;
    let maxIndex = 0;
    if (mediaType === 'images' && question.images?.length) maxIndex = question.images.length - 1;
    else if (mediaType === 'video' && question.videos?.length) maxIndex = question.videos.length - 1;
    else if (mediaType === 'audio' && question.sounds?.length) maxIndex = question.sounds.length - 1;
    const next = currentIndex >= maxIndex ? 0 : currentIndex + 1;
    setMediaIndex(next);
  };

  const isExpert = game.level === 'expert';
  const hasOptions = !!(question?.options && question.options.length > 0);
  const showExpertInput = isExpert && !hasOptions;

  const filteredExpertSpecies = expertQuery.trim()
    ? expertSpecies.filter((s) =>
        speciesDisplayName(s, lang).toLowerCase().includes(expertQuery.trim().toLowerCase())
      )
    : expertSpecies.slice(0, 50);

  const currentMedia = image || video || sound;
  const showPlaceholder = (mediaType === 'images' && (!imageUri || imageError)) ||
    (mediaType === 'video' && !videoUri) ||
    (mediaType === 'audio' && !soundUri);

  if (!question) {
    if (dailyChallengeId && dailyChallengeLoadTimeout) {
      return (
        <View style={styles.centered}>
          <Text style={styles.muted}>{t('loading_question')}</Text>
          <Text style={styles.errorText}>Connection problem. The game could not start.</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => (navigation as any).navigate('DailyChallengeDetail', { challengeId: dailyChallengeId })}
          >
            <Text style={styles.primaryButtonText}>Back to Daily Challenge</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>{t('loading_question')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <FlagMediaModal
        visible={flagModalVisible}
        onClose={() => { setFlagModalVisible(false); setFlagMediaInfo(null); }}
        media={flagMediaInfo}
        playerToken={(player as any)?.token}
        onSuccess={onFlagSuccess}
      />

      {showFeedback && answer !== undefined && (
        <AnswerFeedback
          correct={Boolean(answer?.correct)}
          onAnimationComplete={() => setShowFeedback(false)}
        />
      )}

      <View style={styles.nextSection}>
        {done ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleEndGame}>
            <Text style={styles.primaryButtonText}>{t('end_game')}</Text>
          </TouchableOpacity>
        ) : isHost ? (
          answer ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>{t('next_question')}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.primaryButtonDisabled}>
              <Text style={styles.primaryButtonText}>{t('next_question')}</Text>
            </View>
          )
        ) : (
          <Text style={styles.muted}>{t('waiting_for_host')}</Text>
        )}
      </View>

      <View style={styles.mediaWrap}>
        {mediaType === 'images' && (
          <>
            {imageUri && !imageError ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>🖼</Text>
                <Text style={styles.placeholderSubtext}>
                  {currentMedia ? t('image_failed_to_load') : ''}
                </Text>
                {currentMedia && imageUri && __DEV__ && (
                  <Text style={styles.placeholderDebug} numberOfLines={2}>
                    {imageUri.length > 80 ? imageUri.slice(0, 80) + '…' : imageUri}
                  </Text>
                )}
              </View>
            )}
            {currentMedia && (
              <>
                <View style={styles.creditsRow}>
                  <MediaCredits media={image} />
                  <TouchableOpacity style={styles.flagLink} onPress={openFlagModal}>
                    <Text style={styles.flagLinkText}>🚩 {t('this_seems_wrong')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
        {mediaType === 'video' && videoUri && (
          <>
            <Video
              source={{ uri: videoUri }}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
              shouldPlay
            />
            <View style={styles.creditsRow}>
              <MediaCredits media={video} />
              <TouchableOpacity style={styles.flagLink} onPress={openFlagModal}>
                <Text style={styles.flagLinkText}>🚩 {t('this_seems_wrong')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {mediaType === 'audio' && soundUri && (
          <>
            <Animated.View style={soundPlaying && pulsatingStyle}>
              <TouchableOpacity
                style={[styles.mediaLink, soundPlaying && styles.mediaLinkPlaying]}
                onPress={playSound}
              >
                <Text style={[styles.mediaLinkText, soundPlaying && styles.mediaLinkTextPlaying]}>
                  🔊 {t('play_sound')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            <View style={styles.creditsRow}>
              <MediaCredits media={sound} />
              <TouchableOpacity style={styles.flagLink} onPress={openFlagModal}>
                <Text style={styles.flagLinkText}>🚩 {t('this_seems_wrong')}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {showPlaceholder && !currentMedia && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>🖼</Text>
            <Text style={styles.placeholderSubtext}>{t('loading')}</Text>
          </View>
        )}
      </View>

      {hasOptions ? (
        <View style={styles.options}>
          {question.options!.map((opt, i) => {
            const isChosen = answer?.answer?.id === opt.id;
            const isCorrect = answer?.species?.id === opt.id;
            const isWrong = answer && !answer.correct && answer.answer?.id === opt.id;
            if (answer) {
              const variant = isCorrect ? 'correct' : isWrong || isChosen ? 'wrong' : 'revealed';
              const icon = isCorrect ? 'correct' : isWrong || isChosen ? 'wrong' : undefined;
              return (
                <SpeciesViewButton
                  key={i}
                  label={speciesDisplayName(opt, lang)}
                  onPress={() => setMediaSpecies(opt as SpeciesMediaData)}
                  variant={variant}
                  icon={icon}
                />
              );
            }
            const isSubmitting = submittingId === opt.id;
            const isDisabled = submittingId !== null;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.optionButton, isDisabled && !isSubmitting && styles.optionDisabled]}
                onPress={() => handleAnswer(opt)}
                disabled={isDisabled}
              >
                <View style={styles.optionRow}>
                  <Text style={[styles.optionText, styles.optionTextFlex]} numberOfLines={2}>
                    {speciesDisplayName(opt, lang)}
                  </Text>
                  {isSubmitting && <ActivityIndicator size="small" color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : showExpertInput ? (
        answer ? (
          <View style={styles.options}>
            <SpeciesViewButton
              label={answer.species ? speciesDisplayName(answer.species, lang) : '—'}
              onPress={() => answer.species && setMediaSpecies(answer.species as SpeciesMediaData)}
              variant="correct"
              icon="correct"
            />
            {!answer.correct && answer.answer && (
              <SpeciesViewButton
                label={speciesDisplayName(answer.answer, lang)}
                onPress={() => setMediaSpecies(answer.answer as SpeciesMediaData)}
                variant="wrong"
                icon="wrong"
              />
            )}
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Text style={styles.label}>{t('start_typing_answer')}</Text>
            <TextInput
              style={styles.expertInput}
              value={expertQuery}
              onChangeText={setExpertQuery}
              placeholder={t('species_name_placeholder')}
              placeholderTextColor={colors.primary[500]}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!answer && submittingId === null}
            />
            {submittingId !== null && (
              <View style={styles.expertSubmitting}>
                <ActivityIndicator size="small" color={colors.primary[500]} />
                <Text style={styles.expertSubmittingText}>{t('submitting') || 'Submitting...'}</Text>
              </View>
            )}
            <View style={styles.expertListWrap}>
              <FlatList
                data={submittingId !== null ? [] : filteredExpertSpecies}
                keyExtractor={(s) => String(s.id)}
                keyboardShouldPersistTaps="handled"
                style={styles.expertList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.expertItem}
                    onPress={() => {
                      handleAnswer(item);
                      setExpertQuery('');
                    }}
                  >
                    <Text style={styles.expertItemText} numberOfLines={1}>
                      {speciesDisplayName(item, lang)}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  expertSpecies.length === 0 ? (
                    <Text style={styles.muted}>{t('loading_species')}</Text>
                  ) : (
                    <Text style={styles.muted}>{t('type_to_search')}</Text>
                  )
                }
              />
            </View>
          </KeyboardAvoidingView>
        )
      ) : (
        <Text style={styles.muted}>Free answer not implemented.</Text>
      )}

      {answer && players.length > 0 && (
        <View style={styles.playersSection}>
          <Text style={styles.sectionTitle}>{t('scores')}</Text>
          {players.map((p, i) => (
            <View key={i} style={styles.playerCard}>
              <View style={styles.playerLeft}>
                {p.status === 'correct' && (
                  <View style={[styles.playerStatusIcon, styles.playerStatusIconCorrect]}>
                    <Text style={styles.playerStatusIconText}>✓</Text>
                  </View>
                )}
                {p.status === 'incorrect' && (
                  <View style={[styles.playerStatusIcon, styles.playerStatusIconWrong]}>
                    <Text style={styles.playerStatusIconText}>✗</Text>
                  </View>
                )}
                <Text style={styles.playerName}>{p.name}</Text>
                {p.is_host ? <Text style={styles.crown}>👑</Text> : null}
              </View>
              <View style={styles.playerScores}>
                {p.ranking != null && (
                  <View style={styles.scoreTag}>
                    <Text style={styles.scoreTagText}>#{p.ranking} {t('high_score')}</Text>
                  </View>
                )}
                {p.last_answer?.correct === true && p.last_answer?.score != null && (
                  <View style={styles.scoreTagGreen}>
                    <Text style={styles.scoreTagTextGreen}>+{p.last_answer.score}</Text>
                  </View>
                )}
                <View style={styles.scoreTotal}>
                  <Text style={styles.scoreTotalText}>{p.score ?? 0}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.nextSection}>
        {done ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleEndGame}>
            <Text style={styles.primaryButtonText}>{t('end_game')}</Text>
          </TouchableOpacity>
        ) : isHost && answer ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>{t('next_question')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <SpeciesMediaModal
        visible={!!mediaSpecies}
        onClose={() => setMediaSpecies(null)}
        species={mediaSpecies}
        language={lang}
        playerToken={(player as any)?.token}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: colors.primary[500], marginTop: 8 },
  errorText: { fontSize: 14, color: colors.error[500], marginTop: 12, textAlign: 'center' },
  link: { fontSize: 16, color: colors.primary[500], marginTop: 8 },
  nextSection: { marginBottom: 20 },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: colors.primary[300],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  mediaWrap: { minHeight: 200, marginBottom: 24 },
  creditsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  image: { width: '100%', height: 280, borderRadius: 8, backgroundColor: colors.primary[100] },
  video: { width: '100%', height: 220, borderRadius: 8, backgroundColor: '#000' },
  placeholder: {
    width: '100%',
    height: 280,
    borderRadius: 8,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { fontSize: 48, marginBottom: 8 },
  placeholderSubtext: { fontSize: 14, color: colors.primary[600] },
  placeholderDebug: { fontSize: 10, color: colors.primary[500], marginTop: 8, paddingHorizontal: 12 },
  mediaLink: { paddingVertical: 16, paddingHorizontal: 20, backgroundColor: colors.primary[100], borderRadius: 8, marginTop: 8 },
  mediaLinkPlaying: { backgroundColor: colors.primary[500] },
  mediaLinkText: { fontSize: 16, color: colors.primary[700], fontWeight: '600' },
  mediaLinkTextPlaying: { color: colors.primary[50] },
  flagLink: { marginTop: 8 },
  flagLinkText: { fontSize: 13, color: colors.error[500] },
  label: { fontSize: 14, fontWeight: '600', color: colors.primary[800], marginBottom: 8 },
  expertInput: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.primary[800],
    marginBottom: 8,
  },
  expertListWrap: { maxHeight: 240, marginBottom: 16 },
  expertList: { flexGrow: 0 },
  expertItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.primary[200] },
  expertItemText: { fontSize: 16, color: colors.primary[800] },
  expertSubmitting: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  expertSubmittingText: { fontSize: 14, color: colors.primary[600] },
  options: { gap: 12 },
  optionButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  optionDisabled: { opacity: 0.5 },
  optionText: { fontSize: 16, color: colors.primary[50], fontWeight: '500' },
  optionTextFlex: { flex: 1 },
  playersSection: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.primary[800], marginBottom: 12 },
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: colors.primary[100],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  playerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerStatusIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerStatusIconCorrect: { backgroundColor: colors.success[500] },
  playerStatusIconWrong: { backgroundColor: colors.error[500] },
  playerStatusIconText: { fontSize: 12, fontWeight: '700', color: '#fff' },
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
  scoreTagGreen: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.success[50],
  },
  scoreTagTextGreen: { fontSize: 12, color: colors.success[500], fontWeight: '600' },
  scoreTotal: { minWidth: 36, alignItems: 'flex-end' },
  scoreTotalText: { fontSize: 18, fontWeight: '700', color: colors.primary[700] },
});
