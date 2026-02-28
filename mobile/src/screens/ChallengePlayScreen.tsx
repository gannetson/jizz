import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TextInput,
  FlatList,
  Animated,
} from 'react-native';
import { Video, Audio } from 'expo-av';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import {
  getChallengeQuestion,
  submitChallengeAnswer,
  loadCountryChallenge,
  getStoredChallengePlayerToken,
  type ChallengeQuestion,
  type QuestionOption,
} from '../api/challenge';
import { getSpeciesForCountry } from '../api/species';
import { apiUrl } from '../api/config';
import type { Species } from '../types/game';
import { colors } from '../theme';
import { usePulsatingAnimation } from '../hooks/usePulsatingAnimation';

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

export function ChallengePlayScreen() {
  const route = useRoute<RouteProp<{ ChallengePlay: ChallengePlayParams }, 'ChallengePlay'>>();
  const navigation = useNavigation();
  const { gameToken, challengeId, countryCode, language: paramLanguage, gameLevel, gameMedia } = route.params ?? {};
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ correct: boolean } | null>(null);
  const [expertSpecies, setExpertSpecies] = useState<Species[]>([]);
  const [expertQuery, setExpertQuery] = useState('');
  const soundRef = useRef<Audio.Sound | null>(null);
  const [soundPlaying, setSoundPlaying] = useState(false);

  const loadQuestion = useCallback(async () => {
    if (!gameToken) return;
    setLoading(true);
    try {
      const q = await getChallengeQuestion(gameToken);
      setQuestion(q);
    } catch (e) {
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [gameToken]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  useEffect(() => {
    if (question && countryCode && paramLanguage) {
      getSpeciesForCountry(countryCode, paramLanguage).then(setExpertSpecies);
    }
  }, [question?.id, countryCode, paramLanguage]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [question?.id]);

  useEffect(() => {
    setSoundPlaying(false);
  }, [question?.id]);

  const pulsatingStyle = usePulsatingAnimation(soundPlaying);
  const lang = paramLanguage || 'en';
  const mediaType = gameMedia || (question?.game ? (question as any).game?.media : undefined) || 'images';
  const isExpert = gameLevel === 'expert' || (question as any)?.game?.level === 'expert';
  const options = question?.options ?? [];
  const hasOptions = options.length > 0;

  const image = question?.images?.[question.number];
  const video = question?.videos?.[question.number];
  const sound = question?.sounds?.[question.number];
  const imageUri = image?.url ? (image.url.startsWith('http') ? image.url : apiUrl(image.url)).replace('/1800', '/900') : null;
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

  const checkLevelEndAndNavigate = useCallback(async () => {
    const token = await getStoredChallengePlayerToken();
    if (!token) return;
    try {
      const challenge = await loadCountryChallenge(token);
      const level = challenge?.levels?.[0];
      if (level?.status === 'failed' || level?.status === 'passed') {
        navigation.goBack();
      }
    } catch (_) {}
  }, [navigation]);

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
      setFeedback({ correct });
      const challenge = await loadCountryChallenge(playerToken);
      const level = challenge?.levels?.[0];
      if (level?.status === 'failed' || level?.status === 'passed') {
        setTimeout(() => navigation.goBack(), 1500);
        return;
      }
      setFeedback(null);
      setQuestion(null);
      const nextQ = await getChallengeQuestion(gameToken);
      setQuestion(nextQ ?? null);
    } catch (e) {
      setFeedback({ correct: false });
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>Loading question…</Text>
      </View>
    );
  }

  if (!question) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>Loading next question…</Text>
      </View>
    );
  }

  const filteredSpecies = expertQuery.trim()
    ? expertSpecies.filter((s) =>
        speciesDisplayName(s, lang).toLowerCase().includes(expertQuery.trim().toLowerCase())
      )
    : expertSpecies.slice(0, 50);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {feedback !== null && (
        <View style={[styles.feedbackBox, feedback.correct ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
          <Text style={styles.feedbackText}>{feedback.correct ? 'Correct!' : 'Incorrect'}</Text>
        </View>
      )}

      {mediaType === 'images' && imageUri && (
        <Image source={{ uri: imageUri }} style={styles.mediaImage} resizeMode="contain" />
      )}
      {mediaType === 'video' && videoUri && (
        <Video
          source={{ uri: videoUri }}
          style={styles.mediaVideo}
          useNativeControls
          resizeMode="contain"
        />
      )}
      {mediaType === 'audio' && soundUri && (
        <Animated.View style={soundPlaying && pulsatingStyle}>
          <TouchableOpacity
            style={[styles.audioBtn, soundPlaying && styles.audioBtnPlaying]}
            onPress={playSound}
          >
            <Text style={[styles.audioBtnText, soundPlaying && styles.audioBtnTextPlaying]}>Play sound</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {hasOptions ? (
        <View style={styles.optionsSection}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionButton, submitting && styles.optionButtonDisabled]}
              onPress={() => giveAnswer(opt)}
              disabled={submitting}
            >
              <Text style={styles.optionButtonText}>{speciesDisplayName(opt, lang)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : isExpert ? (
        <View style={styles.expertSection}>
          <Text style={styles.expertLabel}>Type species name</Text>
          <TextInput
            style={styles.expertInput}
            value={expertQuery}
            onChangeText={setExpertQuery}
            placeholder="Species name..."
            placeholderTextColor={colors.primary[500]}
          />
          <FlatList
            data={filteredSpecies}
            keyExtractor={(item) => String(item.id)}
            style={styles.speciesList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.optionButton, submitting && styles.optionButtonDisabled]}
                onPress={() => giveAnswer(item)}
                disabled={submitting}
              >
                <Text style={styles.optionButtonText}>{speciesDisplayName(item, lang)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: colors.primary[600], marginTop: 8 },
  link: { fontSize: 16, color: colors.primary[500], fontWeight: '600', marginTop: 12 },
  feedbackBox: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  feedbackCorrect: { backgroundColor: colors.success[50], borderWidth: 1, borderColor: colors.success[500] },
  feedbackIncorrect: { backgroundColor: colors.error[50], borderWidth: 1, borderColor: colors.error[500] },
  feedbackText: { fontSize: 18, fontWeight: '700', color: colors.primary[800] },
  mediaImage: { width: '100%', height: 240, borderRadius: 8 },
  mediaVideo: { width: '100%', height: 240, borderRadius: 8 },
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
  optionsSection: { marginTop: 24, gap: 12 },
  optionButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  optionButtonDisabled: { opacity: 0.7 },
  optionButtonText: { fontSize: 16, fontWeight: '600', color: colors.primary[50] },
  expertSection: { marginTop: 24 },
  expertLabel: { fontSize: 16, fontWeight: '600', color: colors.primary[800], marginBottom: 8 },
  expertInput: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.primary[800],
    marginBottom: 16,
  },
  speciesList: { maxHeight: 320 },
});
