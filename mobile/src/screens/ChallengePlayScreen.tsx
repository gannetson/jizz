import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import {
  getChallengeQuestion,
  submitChallengeAnswer,
  loadCountryChallenge,
  getNextChallengeLevel,
  getStoredChallengePlayerToken,
  type ChallengeQuestion,
  type QuestionOption,
  type CountryGameLevel,
} from '../api/challenge';
import { postQuestionMediaReady } from '../api/games';
import { getSpeciesForCountry } from '../api/species';
import { apiUrl } from '../api/config';
import type { Species } from '../types/game';
import { colors } from '../theme';
import { usePulsatingAnimation } from '../hooks/usePulsatingAnimation';
import { AnswerFeedback } from '../components/AnswerFeedback';
import { SpeciesViewButton } from '../components/SpeciesViewButton';
import { SpeciesMediaModal, type SpeciesMediaData } from '../components/SpeciesMediaModal';
import { FlagMediaModal, type FlagMediaInfo } from '../components/FlagMediaModal';
import { QuestionMediaView } from '../components/QuestionMediaView';
import { useTranslation } from '../i18n/TranslationContext';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

type ChallengePlayParams = {
  gameToken: string;
  challengeId: number;
  countryCode?: string;
  language?: string;
  gameLevel?: string;
  gameMedia?: string;
};

function speciesDisplayName(s: QuestionOption | Species, lang?: string): string {
  const o = s as QuestionOption & Species;
  if (o.name_translated) return o.name_translated;
  if (lang === 'nl' && o.name_nl) return o.name_nl;
  if (lang === 'la' && o.name_latin) return o.name_latin;
  return o.name || o.name_latin || '';
}

/** Provides audio playback hooks only when mounted (past early returns). Avoids "fewer hooks" when restarting. */
function ChallengePlayAudio({
  soundUri,
  children,
}: {
  soundUri: string | null;
  children: (args: { playSound: () => void; soundPlaying: boolean; pulsatingStyle: ReturnType<typeof usePulsatingAnimation> }) => React.ReactNode;
}) {
  const audioPlayer = useAudioPlayer(soundUri ?? null);
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const soundPlaying = audioStatus.playing;
  const pulsatingStyle = usePulsatingAnimation(soundPlaying);
  const playSound = useCallback(() => {
    if (soundUri) audioPlayer.play();
  }, [soundUri, audioPlayer]);
  return <>{children({ playSound, soundPlaying, pulsatingStyle })}</>;
}

export function ChallengePlayScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<{ ChallengePlay: ChallengePlayParams }, 'ChallengePlay'>>();
  const navigation = useNavigation();
  const { gameToken, challengeId, countryCode, language: paramLanguage, gameLevel, gameMedia } = route.params ?? {};
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answerResult, setAnswerResult] = useState<{
    correct: boolean;
    userAnswer: QuestionOption | Species;
    correctSpecies: QuestionOption | Species;
  } | null>(null);
  const [levelEnded, setLevelEnded] = useState(false);
  const [level, setLevel] = useState<CountryGameLevel | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [nextLevelLoading, setNextLevelLoading] = useState(false);
  const [mediaSpecies, setMediaSpecies] = useState<SpeciesMediaData | null>(null);
  const [flagModalVisible, setFlagModalVisible] = useState(false);
  const [flagMediaInfo, setFlagMediaInfo] = useState<FlagMediaInfo | null>(null);
  const [challengePlayerToken, setChallengePlayerToken] = useState<string | undefined>(undefined);
  const [expertSpecies, setExpertSpecies] = useState<Species[]>([]);
  const [expertQuery, setExpertQuery] = useState('');
  const [mediaReady, setMediaReady] = useState(false);
  /** After flagging, advance to next media item (same as MPG GamePlayScreen). */
  const [mediaIndex, setMediaIndex] = useState<number | null>(null);

  const loadQuestion = useCallback(async () => {
    if (!gameToken) return;
    setLoading(true);
    try {
      const token = await getStoredChallengePlayerToken();
      const q = await getChallengeQuestion(gameToken, token ?? undefined, { cacheBust: true });
      setQuestion(q);
    } catch (e) {
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [gameToken]);

  /** Fetch next question when user taps "Next question". */
  const fetchNextQuestion = useCallback(async () => {
    if (!gameToken) return;
    setAnswerResult(null);
    setLevelEnded(false);
    setFeedback(null);
    setShowFeedback(false);
    setQuestion(null);
    setLoading(true);
    try {
      const token = await getStoredChallengePlayerToken();
      const q = await getChallengeQuestion(gameToken, token ?? undefined, { cacheBust: true });
      setQuestion(q ?? null);
      if (challengeId && token) {
        const challenge = await loadCountryChallenge(token, { cacheBust: true });
        const currentLevel =
          challenge?.levels?.find((l) => l.game?.token === gameToken) ?? challenge?.levels?.[0];
        setLevel(currentLevel ?? null);
      }
    } catch (e) {
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [gameToken, challengeId]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  useEffect(() => {
    if (question) setMediaIndex(question.number ?? 0);
  }, [question?.id]);

  useEffect(() => {
    setMediaReady(false);
  }, [question?.id, mediaIndex]);

  useEffect(() => {
    if (!gameToken) return;
    getStoredChallengePlayerToken().then((token) => {
      if (token) setChallengePlayerToken(token);
    });
  }, [gameToken]);

  /** Load level (jokers, progress) from challenge. Use cacheBust when we need fresh data (e.g. after new question). */
  const loadLevel = useCallback(async (cacheBust?: boolean) => {
    if (!challengeId || !gameToken) return;
    const token = await getStoredChallengePlayerToken();
    if (!token) return;
    try {
      const challenge = await loadCountryChallenge(token, cacheBust ? { cacheBust: true } : undefined);
      const currentLevel =
        challenge?.levels?.find((l) => l.game?.token === gameToken) ?? challenge?.levels?.[0];
      setLevel(currentLevel ?? null);
    } catch {
      setLevel(null);
    }
  }, [challengeId, gameToken]);

  useEffect(() => {
    loadLevel();
  }, [loadLevel]);

  /** Whenever a new question is set, refresh level so jokers and progress render correctly. */
  useEffect(() => {
    if (question?.id && challengeId && gameToken) {
      loadLevel(true);
    }
  }, [question?.id, question?.sequence, challengeId, gameToken, loadLevel]);

  useEffect(() => {
    if (question && countryCode && paramLanguage) {
      getSpeciesForCountry(countryCode, paramLanguage).then(setExpertSpecies);
    }
  }, [question?.id, countryCode, paramLanguage]);

  useEffect(() => {
    setExpertQuery('');
  }, [question?.id]);

  const handleRestartLevel = useCallback(async () => {
    if (!challengeId) return;
    const token = await getStoredChallengePlayerToken();
    if (!token) return;
    setRestarting(true);
    try {
      await getNextChallengeLevel(challengeId, token);
      const challenge = await loadCountryChallenge(token, { cacheBust: true });
      const levels = challenge?.levels ?? [];
      const newLevel = levels.find(
        (l) => l.game?.token !== gameToken && (l.game?.scores?.[0]?.answers?.length ?? 0) === 0
      ) ?? levels[levels.length - 1];
      const newGameToken = newLevel?.game?.token;
      if (newGameToken) {
        (navigation as any).replace('ChallengeLevelIntro', {
          challengeId,
          gameToken: newGameToken,
        });
      } else {
        navigation.goBack();
      }
    } catch (_) {
      setRestarting(false);
    }
  }, [challengeId, gameToken, navigation]);

  const handleNextLevel = useCallback(async () => {
    if (!challengeId) return;
    const token = await getStoredChallengePlayerToken();
    if (!token) return;
    setNextLevelLoading(true);
    try {
      await getNextChallengeLevel(challengeId, token);
      const challenge = await loadCountryChallenge(token, { cacheBust: true });
      const levels = challenge?.levels ?? [];
      const newLevel = levels.find(
        (l) => l.game?.token !== gameToken && (l.game?.scores?.[0]?.answers?.length ?? 0) === 0
      ) ?? levels[levels.length - 1];
      const newGameToken = newLevel?.game?.token;
      if (newGameToken) {
        (navigation as any).replace('ChallengeLevelIntro', {
          challengeId,
          gameToken: newGameToken,
        });
      } else {
        navigation.goBack();
      }
    } catch (_) {
      setNextLevelLoading(false);
    }
  }, [challengeId, gameToken, navigation]);

  const lang = paramLanguage || 'en';
  const mediaType = gameMedia || (question?.game ? (question as any).game?.media : undefined) || 'images';
  const isExpert = gameLevel === 'expert' || (question as any)?.game?.level === 'expert';
  const options = question?.options ?? [];
  const hasOptions = options.length > 0;

  const currentMediaIdx = question != null ? (mediaIndex ?? question.number ?? 0) : 0;
  const image = question?.images?.[currentMediaIdx];
  const video = question?.videos?.[currentMediaIdx];
  const soundForAudio = question?.sounds?.[currentMediaIdx];
  const soundUri = soundForAudio?.url ? (soundForAudio.url.startsWith('http') ? soundForAudio.url : apiUrl(soundForAudio.url)) : null;
  const imageUri = image?.url ? (image.url.startsWith('http') ? image.url : apiUrl(image.url)).replace('/1800', '/900') : null;
  const videoUri = video?.url ? (video.url.startsWith('http') ? video.url : apiUrl(video.url)) : null;

  const onFlagSuccess = useCallback(() => {
    if (!question) return;
    setFlagModalVisible(false);
    setFlagMediaInfo(null);
    let maxIndex = 0;
    if (mediaType === 'images' && question.images?.length) maxIndex = question.images.length - 1;
    else if (mediaType === 'video' && question.videos?.length) maxIndex = question.videos.length - 1;
    else if (mediaType === 'audio' && question.sounds?.length) maxIndex = question.sounds.length - 1;
    const idx = mediaIndex ?? question.number ?? 0;
    setMediaIndex(idx >= maxIndex ? 0 : idx + 1);
  }, [question, mediaType, mediaIndex]);

  const openFlagModal = useCallback(() => {
    if (!question) return;
    const idx = mediaIndex ?? question.number ?? 0;
    let mediaData: FlagMediaInfo | null = null;
    if (mediaType === 'images' && question.images?.[idx]) {
      const item = question.images[idx] as { id?: number; url: string; link?: string; contributor?: string };
      mediaData = {
        id: item.id ?? 0,
        type: 'image',
        url: item.url,
        link: item.link,
        contributor: item.contributor,
        index: idx,
      };
    } else if (mediaType === 'video' && question.videos?.[idx]) {
      const item = question.videos[idx] as { id?: number; url: string; link?: string; contributor?: string };
      mediaData = {
        id: item.id ?? 0,
        type: 'video',
        url: item.url,
        link: item.link,
        contributor: item.contributor,
        index: idx,
      };
    } else if (mediaType === 'audio' && question.sounds?.[idx]) {
      const item = question.sounds[idx] as { id?: number; url: string; link?: string; contributor?: string };
      mediaData = {
        id: item.id ?? 0,
        type: 'audio',
        url: item.url,
        link: item.link,
        contributor: item.contributor,
        index: idx,
      };
    }
    if (mediaData && mediaData.id) {
      setFlagMediaInfo(mediaData);
      setFlagModalVisible(true);
    }
  }, [question, mediaType, mediaIndex]);

  const checkLevelEndAndNavigate = useCallback(async () => {
    const token = await getStoredChallengePlayerToken();
    if (!token || !gameToken) return;
    try {
      const challenge = await loadCountryChallenge(token, { cacheBust: true });
      const level =
        challenge?.levels?.find((l) => l.game?.token === gameToken) ?? challenge?.levels?.[0];
      if (level?.status === 'failed' || level?.status === 'passed') {
        navigation.goBack();
      }
    } catch (_) {}
  }, [navigation, gameToken]);

  useEffect(() => {
    if (!loading && !question && gameToken) {
      checkLevelEndAndNavigate();
    }
  }, [loading, question, gameToken, checkLevelEndAndNavigate]);

  const giveAnswer = async (option: QuestionOption | Species) => {
    if (!question || submitting || feedback) return;
    const playerToken = await getStoredChallengePlayerToken();
    if (!playerToken) return;
    setSubmitting(true);
    setFeedback(null);
    setAnswerResult(null);
    setLevelEnded(false);
    try {
      const response = await submitChallengeAnswer(
        {
          question_id: question.id,
          answer_id: option.id,
          player_token: playerToken,
        },
        playerToken
      );
      const correct = response?.correct ?? false;
      const userAnswer = (response?.answer ?? option) as QuestionOption | Species;
      const correctSpecies = (response?.species ?? userAnswer) as QuestionOption | Species;
      setFeedback({ correct });
      setShowFeedback(true);
      setAnswerResult({ correct, userAnswer, correctSpecies });
      const challenge = await loadCountryChallenge(playerToken, { cacheBust: true });
      const levelData =
        challenge?.levels?.find((l) => l.game?.token === gameToken) ?? challenge?.levels?.[0];
      setLevel(levelData ?? null);
      if (levelData?.status === 'failed' || levelData?.status === 'passed') {
        setLevelEnded(true);
      }
    } catch (e) {
      setFeedback({ correct: false });
      setShowFeedback(true);
      setAnswerResult({
        correct: false,
        userAnswer: option as QuestionOption | Species,
        correctSpecies: (question?.options?.[0] ?? option) as QuestionOption | Species,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!gameToken || !challengeId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Missing game data</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !question) {
    return (
      <View style={styles.centered} testID="challengePlay.loading">
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>{t('loading_question')}</Text>
      </View>
    );
  }

  if (!question) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>{t('error_loading_question')}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => loadQuestion()}
          testID="challengePlay.retryQuestion"
          accessibilityLabel="Retry"
        >
          <Text style={styles.primaryButtonText}>{t('retry')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.link}>{t('back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredSpecies = expertQuery.trim()
    ? expertSpecies.filter((s) =>
        speciesDisplayName(s, lang).toLowerCase().includes(expertQuery.trim().toLowerCase())
      )
    : expertSpecies.slice(0, 50);

  const countryName = level?.game?.country?.name ?? countryCode ?? 'Country';

  // Progress icons: previous answers from level.game.scores[0].answers; current question from answerResult.
  type ProgressResult = 'open' | 'correct' | 'joker' | 'incorrect';
  const levelLength =
    level?.game?.length ?? level?.challenge_level?.length ?? 0;
  const answers = level?.game?.scores?.[0]?.answers ?? [];
  const progressResults: ProgressResult[] = Array.from({ length: levelLength }, () => 'open');
  answers.forEach((a: { sequence?: number; correct?: boolean }) => {
    const idx = (Number(a.sequence ?? 1) - 1);
    if (idx >= 0 && idx < levelLength) progressResults[idx] = a.correct ? 'correct' : 'incorrect';
  });
  // Apply the current answer so progress updates immediately after answering
  if (answerResult !== null && question && levelLength > 0) {
    const currentIdx = (question.sequence ?? 1) - 1;
    if (currentIdx >= 0 && currentIdx < levelLength) {
      progressResults[currentIdx] = answerResult.correct ? 'correct' : 'incorrect';
    }
  }
  const incorrectIndices = progressResults
    .map((r, i) => (r === 'incorrect' ? i : -1))
    .filter((i) => i >= 0);
  const jokerCount = level?.challenge_level?.jokers ?? 0;
  incorrectIndices.slice(0, jokerCount).forEach((idx) => {
    progressResults[idx] = 'joker';
  });

  return (
    <ChallengePlayAudio soundUri={soundUri}>
      {({ playSound, soundPlaying, pulsatingStyle }) => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} testID="challengePlay.screen">
      <View style={styles.row}>
      <Text style={styles.screenTitle}>{countryName}</Text>
      {level && level.challenge_level.jokers > 0 ? (
        <View>
          <View style={styles.jokersHearts}>
            {Array.from({ length: level.challenge_level.jokers }).map((_, i) =>
              i < level.remaining_jokers ? (
                <FontAwesome5 key={i} name="heart" solid size={22} color={colors.primary[500]} />
              ) : (
                <FontAwesome5 key={i} name="heart-broken" solid size={22} color={colors.primary[300]} />
              )
            )}
          </View>
        </View>
      ) : null}

      </View>
      <View style={styles.mediaWrap}>
        {showFeedback && feedback !== null && (
          <AnswerFeedback
            correct={feedback.correct}
            onAnimationComplete={() => setShowFeedback(false)}
          />
        )}
        <QuestionMediaView
          mediaType={mediaType}
          imageUri={imageUri}
          imageMedia={image}
          videoUri={videoUri}
          videoMedia={video}
          soundUri={soundUri}
          soundMedia={soundForAudio && typeof soundForAudio === 'object' ? soundForAudio : undefined}
          onPlaySound={playSound}
          soundPlaying={soundPlaying}
          pulsatingStyle={pulsatingStyle}
          onFlagPress={openFlagModal}
          flagLabel={t('this_seems_wrong')}
          playSoundLabel={`🔊 ${t('play_sound')}`}
          containerStyle={styles.challengeMediaWrap}
          onMediaReady={() => {
            setMediaReady(true);
            if (!question?.id) return;
            const run = async () => {
              const token = challengePlayerToken ?? (await getStoredChallengePlayerToken());
              if (token) {
                postQuestionMediaReady(question.id, token).catch(() => {});
              }
            };
            void run();
          }}
        />
      </View>

      {answerResult !== null ? (
        <View style={styles.nextSection}>
          {levelEnded ? (
            level?.status === 'failed' ? (
              <>
                <Text style={styles.levelFailedText}>{t('level_failed')}</Text>
                <TouchableOpacity
                  style={[styles.primaryButton, restarting && styles.optionButtonDisabled]}
                  onPress={handleRestartLevel}
                  disabled={restarting}
                  testID="challengePlay.restartLevel"
                  accessibilityLabel="Start level again"
                >
                  {restarting ? (
                    <ActivityIndicator size="small" color={colors.primary[50]} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('restart_level')}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : level?.status === 'passed' ? (
              <>
                <Text style={styles.levelCompleteTitle}>{t('level_complete')}</Text>
                <Text style={styles.levelCompleteDescription}>{t('level_complete_description')}</Text>
                <TouchableOpacity
                  style={[styles.primaryButton, nextLevelLoading && styles.optionButtonDisabled]}
                  onPress={handleNextLevel}
                  disabled={nextLevelLoading}
                  testID="challengePlay.nextLevel"
                  accessibilityLabel="Next level"
                >
                  {nextLevelLoading ? (
                    <ActivityIndicator size="small" color={colors.primary[50]} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('next_level')}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.goBack()}
                testID="challengePlay.endLevel"
                accessibilityLabel="End level"
              >
                <Text style={styles.primaryButtonText}>{t('end_level')}</Text>
              </TouchableOpacity>
            )
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => fetchNextQuestion()}
              testID="challengePlay.nextQuestion"
              accessibilityLabel="Next question"
            >
              <Text style={styles.primaryButtonText}>{t('next_question')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {hasOptions ? (
        <View style={styles.optionsSection}>
          {answerResult !== null ? (
            options.map((opt, idx) => {
              const isCorrect = opt.id === answerResult.correctSpecies.id;
              const isWrong = !answerResult.correct && opt.id === answerResult.userAnswer.id;
              const variant = isCorrect ? 'correct' : isWrong ? 'wrong' : 'revealed';
              const icon = isCorrect ? 'correct' : isWrong ? 'wrong' : undefined;
              return (
                <SpeciesViewButton
                  key={opt.id}
                  label={speciesDisplayName(opt, lang)}
                  onPress={() => setMediaSpecies(opt as SpeciesMediaData)}
                  variant={variant}
                  icon={icon}
                  testID={idx === 0 ? 'challengePlay.firstOption' : `challengePlay.option.${opt.id}`}
                  accessibilityLabel={idx === 0 ? 'First answer option' : speciesDisplayName(opt, lang)}
                />
              );
            })
          ) : (
            options.map((opt, idx) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.optionButton, (submitting || !mediaReady) && styles.optionButtonDisabled]}
                onPress={() => giveAnswer(opt)}
                disabled={submitting || !mediaReady}
                testID={idx === 0 ? 'challengePlay.firstOption' : `challengePlay.option.${opt.id}`}
                accessibilityLabel={idx === 0 ? 'First answer option' : speciesDisplayName(opt, lang)}
              >
                <Text style={styles.optionButtonText}>{speciesDisplayName(opt, lang)}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      ) : isExpert ? (
        <View style={styles.expertSection}>
          {answerResult !== null ? (
            <>
              <SpeciesViewButton
                label={speciesDisplayName(answerResult.correctSpecies, lang)}
                onPress={() => setMediaSpecies(answerResult.correctSpecies as SpeciesMediaData)}
                variant="correct"
                icon="correct"
                testID="challengePlay.expertCorrect"
                accessibilityLabel={speciesDisplayName(answerResult.correctSpecies, lang)}
              />
              {!answerResult.correct && answerResult.userAnswer.id !== answerResult.correctSpecies.id && (
                <SpeciesViewButton
                  label={speciesDisplayName(answerResult.userAnswer, lang)}
                  onPress={() => setMediaSpecies(answerResult.userAnswer as SpeciesMediaData)}
                  variant="wrong"
                  icon="wrong"
                  testID="challengePlay.expertWrong"
                  accessibilityLabel={speciesDisplayName(answerResult.userAnswer, lang)}
                />
              )}
            </>
          ) : (
            <>
              <Text style={styles.expertLabel}>{t('start_typing_answer')}</Text>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.expertInputWrap}
              >
                <TextInput
                  style={styles.expertInput}
                  value={expertQuery}
                  onChangeText={setExpertQuery}
                  placeholder={t('species_name_placeholder')}
                  placeholderTextColor={colors.primary[500]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting && mediaReady}
                  testID="challengePlay.expertInput"
                  accessibilityLabel="Species name"
                />
                {submitting && (
                  <View style={styles.expertSubmitting}>
                    <ActivityIndicator size="small" color={colors.primary[500]} />
                    <Text style={styles.expertSubmittingText}>{t('submitting') || 'Submitting…'}</Text>
                  </View>
                )}
                <View style={styles.speciesListWrap}>
                  {expertSpecies.length === 0 && filteredSpecies.length === 0 ? (
                    <Text style={styles.speciesListEmpty}>{t('loading_species')}</Text>
                  ) : filteredSpecies.length === 0 ? (
                    <Text style={styles.speciesListEmpty}>{t('type_to_search')}</Text>
                  ) : (
                    filteredSpecies.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.optionButton, styles.speciesListItem, (submitting || !mediaReady) && styles.optionButtonDisabled]}
                        onPress={() => giveAnswer(item)}
                        disabled={submitting || !mediaReady}
                        testID={`challengePlay.expertOption.${item.id}`}
                        accessibilityLabel={speciesDisplayName(item, lang)}
                      >
                        <Text style={styles.optionButtonText} numberOfLines={1}>
                          {speciesDisplayName(item, lang)}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </KeyboardAvoidingView>
            </>
          )}
        </View>
      ) : null}
      {levelLength > 0 ? (
        <View style={styles.progressSection}>
          <Text style={styles.progressHeading}>{t('progress')}</Text>
          <View style={styles.progressCard}>
            {/* Previous answers from level.game.scores[0].answers; current from answerResult. */}
            <View style={styles.progressRow}>
              {progressResults.map((result, i) => {
                const isCurrent = question && (question.sequence ?? 1) === i + 1 && answerResult === null;
                const iconColor = isCurrent
                  ? colors.primary[700]
                  : result === 'open' || result === 'incorrect'
                    ? colors.primary[300]
                    : colors.primary[600];
                const size = 20;
                return (
                  <View key={i} style={isCurrent ? styles.progressIconCurrentWrap : undefined}>
                    {result === 'open' && (
                      <FontAwesome5 name="circle" size={size} color={iconColor} />
                    )}
                    {result === 'correct' && (
                      <FontAwesome5 name="check-circle" solid size={size} color={iconColor} />
                    )}
                    {result === 'joker' && (
                      <FontAwesome5 name="heart" solid size={size} color={iconColor} />
                    )}
                    {result === 'incorrect' && (
                      <FontAwesome5 name="heart-broken" solid size={size} color={iconColor} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
      <SpeciesMediaModal
        visible={!!mediaSpecies}
        onClose={() => setMediaSpecies(null)}
        species={mediaSpecies}
        language={lang}
        playerToken={undefined}
      />
      <FlagMediaModal
        visible={flagModalVisible}
        onClose={() => { setFlagModalVisible(false); setFlagMediaInfo(null); }}
        media={flagMediaInfo}
        playerToken={challengePlayerToken}
        onSuccess={onFlagSuccess}
      />
    </ScrollView>
      )}
    </ChallengePlayAudio>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: colors.primary[600], marginTop: 8 },
  link: { fontSize: 16, color: colors.primary[500], fontWeight: '600', marginTop: 12 },
  backLink: { marginTop: 16 },
  mediaWrap: { marginBottom: 16 },
  challengeMediaWrap: { marginBottom: 16 },
  mediaImage: { width: '100%', height: 240, borderRadius: 8 },
  mediaVideo: { width: '100%', height: 240, borderRadius: 8 },
  nextSection: { marginTop: 0, marginBottom: 12 },
  levelFailedText: { fontSize: 18, fontWeight: '600', color: colors.primary[800], marginBottom: 12 },
  levelCompleteTitle: { fontSize: 20, fontWeight: '700', color: colors.primary[800], marginBottom: 8 },
  levelCompleteDescription: { fontSize: 15, color: colors.primary[700], marginBottom: 16 },
  jokersRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  row: {     flexDirection: 'row',
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  jokersHearts: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.primary[50] },
  audioBtn: {
    backgroundColor: colors.primary[200],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  audioBtnPlaying: { backgroundColor: colors.primary[500] },
  audioBtnText: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  audioBtnTextPlaying: { color: colors.primary[50] },
  optionsSection: { marginTop: 12, gap: 12 },
  optionButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 0,
  },
  optionButtonDisabled: { opacity: 0.7 },
  optionButtonText: { fontSize: 16, fontWeight: '600', color: colors.primary[50] },
  expertSection: { marginTop: 24 },
  expertInputWrap: { marginBottom: 0 },
  expertLabel: { fontSize: 16, fontWeight: '600', color: colors.primary[800], marginBottom: 8 },
  expertInput: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.primary[800],
    marginBottom: 8,
  },
  expertSubmitting: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginBottom: 8 },
  expertSubmittingText: { fontSize: 14, color: colors.primary[600] },
  speciesListWrap: { marginBottom: 16 },
  speciesListEmpty: { fontSize: 14, color: colors.primary[500], paddingVertical: 16, paddingHorizontal: 12 },
  speciesListItem: { marginBottom: 8 },
  screenTitle: { fontSize: 20, fontWeight: '700', color: colors.primary[800], marginBottom: 12 },
  progressSection: { marginTop: 24, marginBottom: 16 },
  progressHeading: { fontSize: 18, fontWeight: '600', color: colors.primary[800], marginBottom: 8 },
  progressCard: { backgroundColor: colors.primary[100], padding: 16, borderRadius: 8 },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  progressIconCurrentWrap: {},
});
