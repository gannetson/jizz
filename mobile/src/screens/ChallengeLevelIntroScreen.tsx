import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import {
  loadCountryChallenge,
  getNextChallengeLevel,
  getStoredChallengePlayerToken,
  clearStoredChallengePlayerToken,
  type CountryChallenge,
} from '../api/challenge';
import { colors } from '../theme';

type ChallengeLevelIntroParams = {
  challengeId?: number;
  gameToken?: string;
};

export function ChallengeLevelIntroScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ ChallengeLevelIntro: ChallengeLevelIntroParams }, 'ChallengeLevelIntro'>>();
  const { challengeId: paramChallengeId, gameToken: paramGameToken } = route.params ?? {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<CountryChallenge | null>(null);
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [nextLevelLoading, setNextLevelLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const token = await getStoredChallengePlayerToken();
        if (token) {
          try {
            const cacheBust = !!paramGameToken;
            const c = await loadCountryChallenge(token, cacheBust ? { cacheBust: true } : undefined);
            if (cancelled) return;
            if (c === null) {
              await clearStoredChallengePlayerToken();
              setChallenge(null);
              setPlayerToken(null);
              navigation.goBack();
            } else {
              setChallenge(c);
              setPlayerToken(token);
            }
          } catch (e: any) {
            if (cancelled) return;
            await clearStoredChallengePlayerToken();
            setChallenge(null);
            setPlayerToken(null);
            setError(e?.message ?? 'Failed to load challenge');
          }
        } else {
          if (!cancelled) {
            setChallenge(null);
            setPlayerToken(null);
            navigation.goBack();
          }
        }
        if (!cancelled) setLoading(false);
      })();
      return () => { cancelled = true; };
    }, [navigation, paramGameToken])
  );

  const level = paramGameToken
    ? challenge?.levels?.find((l) => l.game?.token === paramGameToken) ?? challenge?.levels?.[0]
    : challenge?.levels?.[0];
  const status = level?.status;
  const hasAnswers = (level?.game?.scores?.[0]?.answers?.length ?? 0) > 0;
  const effectiveStatus = status === 'running' && !hasAnswers ? 'new' : status;

  const handleStartLevel = () => {
    // Prefer game token from route params (from create/continue) so we always use the correct challenge game
    const gameToken = paramGameToken ?? challenge?.levels?.[0]?.game?.token;
    const challengeId = paramChallengeId ?? challenge?.id;
    const gameLevel = challenge?.levels?.[0]?.game?.level;
    const gameMedia = challenge?.levels?.[0]?.game?.media;
    const language = challenge?.levels?.[0]?.game?.language ?? 'en';
    if (gameToken && challengeId && playerToken) {
      (navigation as any).navigate('ChallengePlay', {
        gameToken,
        challengeId,
        countryCode: challenge?.country?.code,
        language,
        gameLevel: gameLevel ?? 'advanced',
        gameMedia: gameMedia ?? 'images',
      });
    }
  };

  const handleRestartOrNextLevel = async () => {
    if (!challenge?.id || !playerToken) return;
    setNextLevelLoading(true);
    setError(null);
    try {
      await getNextChallengeLevel(challenge.id, playerToken);
      const c = await loadCountryChallenge(playerToken);
      setChallenge(c);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to continue');
    } finally {
      setNextLevelLoading(false);
    }
  };

  if (loading && !challenge) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  if (!challenge || !level) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>No challenge found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {effectiveStatus === 'new' ? (
        <>
          <Text style={styles.subtitle}>
            Round {level.challenge_level.sequence + 1} – {level.challenge_level.title}
          </Text>
          <Text style={styles.sectionLabel}>What is this level about?</Text>
          <Text style={styles.description}>
            {level.challenge_level.description}
          </Text>
          <Text style={styles.jokersLabel}>Jokers this round:</Text>
          <View style={styles.jokersRow}>
            {Array.from({ length: level.challenge_level.jokers }).map((_, i) => (
              <Text
                key={i}
                style={[styles.jokerHeart, styles.jokerHeartFull]}
              >
                ♥
              </Text>
            ))}
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartLevel}
            testID="countryChallenge.startLevel"
            accessibilityLabel="Start Level"
          >
            <Text style={styles.primaryButtonText}>Start Level</Text>
          </TouchableOpacity>
        </>
      ) : effectiveStatus === 'failed' ? (
        <>
          <Text style={[styles.title, styles.failedTitle]}>
            Failed! Round {level.challenge_level.sequence + 1} – {level.challenge_level.title}
          </Text>
          <Text style={styles.description}>
            Ouch! That was one wrong answer too many...
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, nextLevelLoading && styles.buttonDisabled]}
            onPress={handleRestartOrNextLevel}
            disabled={nextLevelLoading}
            testID="countryChallenge.restartLevel"
            accessibilityLabel="Restart Level"
          >
            {nextLevelLoading ? (
              <ActivityIndicator color={colors.primary[50]} />
            ) : (
              <Text style={styles.primaryButtonText}>Restart Level</Text>
            )}
          </TouchableOpacity>
        </>
      ) : effectiveStatus === 'passed' ? (
        <>
          <Text style={styles.title}>
            Congratulations! Level {level.challenge_level.sequence + 1} completed!
          </Text>
          <Text style={styles.description}>
            Well done! Ready for the next challenge?
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, nextLevelLoading && styles.buttonDisabled]}
            onPress={handleRestartOrNextLevel}
            disabled={nextLevelLoading}
            testID="countryChallenge.nextLevel"
            accessibilityLabel="Next Level"
          >
            {nextLevelLoading ? (
              <ActivityIndicator color={colors.primary[50]} />
            ) : (
              <Text style={styles.primaryButtonText}>Next Level</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Level in progress</Text>
          {(() => {
            const answersCount = level?.game?.scores?.[0]?.answers?.length ?? 0;
            const total = typeof level?.game?.length === 'number' ? level.game.length : Number(level?.game?.length) || 0;
            const currentQuestion = answersCount + 1;
            if (total > 0 && currentQuestion <= total) {
              return (
                <Text style={styles.questionProgress}>
                  Question {currentQuestion} of {total}
                </Text>
              );
            }
            return null;
          })()}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleStartLevel}
            testID="countryChallenge.continue"
            accessibilityLabel="Continue"
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: colors.primary[600], marginTop: 8 },
  backLink: { marginTop: 16 },
  link: { fontSize: 16, color: colors.primary[500], fontWeight: '600' },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 8 },
  questionProgress: { fontSize: 16, color: colors.primary[700], marginBottom: 12 },
  failedTitle: { color: colors.error[500] },
  subtitle: { fontSize: 20, fontWeight: '700', color: colors.primary[800], marginBottom: 12 },
  sectionLabel: { fontSize: 18, fontWeight: '600', color: colors.primary[700], marginTop: 8, marginBottom: 4 },
  description: { fontSize: 15, color: colors.primary[700], marginTop: 8, lineHeight: 22 },
  jokersLabel: { fontSize: 15, color: colors.primary[700], marginTop: 20, marginBottom: 8 },
  jokersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  jokerHeart: { fontSize: 24 },
  jokerHeartFull: { color: colors.primary[600] },
  primaryButton: {
    marginTop: 28,
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.primary[50], fontSize: 18, fontWeight: '600' },
});
