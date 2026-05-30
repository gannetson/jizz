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
  completeJourneyStep,
  getBirdrJourney,
  startJourneyStep,
  getStoredBirdrJourneyPlayerToken,
} from '../api/birdrJourney';
import { setStoredChallengePlayerToken } from '../api/challenge';
import { BirdrMoodHero } from '../components/BirdrMoodHero';
import { useTranslation } from '../i18n/TranslationContext';
import { colors } from '../theme';

type RouteParams = {
  BirdrJourneyStepResults: {
    journeyId: number;
    countryCode: string;
    gameToken: string;
  };
};

export function BirdrJourneyStepResultsScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RouteParams, 'BirdrJourneyStepResults'>>();
  const { journeyId, countryCode, gameToken } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const result = await completeJourneyStep(journeyId, gameToken);
          if (cancelled) return;
          if (result.status === 'new' || result.status === 'running') {
            (navigation as any).replace('BirdrJourneyStepIntro', { journeyId, countryCode, gameToken });
            return;
          }
          setPassed(result.status === 'passed');
          setLevelComplete(result.level_complete);
        } catch (e: unknown) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : t('failed_load'));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => { cancelled = true; };
    }, [journeyId, gameToken, t])
  );

  const handleContinue = () => {
    if (levelComplete) {
      (navigation as any).replace('BirdrJourneyLevelCelebration', {
        journeyId,
        countryCode,
      });
      return;
    }
    (navigation as any).replace('BirdrJourneyProgress', { countryCode });
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const playerToken = await getStoredBirdrJourneyPlayerToken();
      if (playerToken) {
        await setStoredChallengePlayerToken(playerToken);
      }
      await startJourneyStep(journeyId);
      (navigation as any).replace('BirdrJourneyStepIntro', { journeyId, countryCode });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <BirdrMoodHero
          mood="waiting"
          title={t('calculating_progress')}
          showSpinner
          pulse
        />
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

      {passed ? (
        <>
          <BirdrMoodHero mood="success" />
          <Text style={styles.title}>{t('birdr_journey_step_passed')}</Text>
          <Text style={styles.description}>
            {levelComplete
              ? t('birdr_journey_level_complete_hint')
              : t('birdr_journey_step_complete_hint')}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} testID="journey.continueTrail">
            <Text style={styles.primaryButtonText}>{t('continue')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <BirdrMoodHero mood="failed" />
          <Text style={[styles.title, styles.failedTitle]}>{t('birdr_journey_step_failed')}</Text>
          <Text style={styles.description}>{t('failed_message')}</Text>
          <TouchableOpacity
            style={[styles.primaryButton, retrying && styles.buttonDisabled]}
            onPress={handleRetry}
            disabled={retrying}
            testID="journey.retryStep"
          >
            {retrying ? (
              <ActivityIndicator color={colors.primary[50]} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('restart_level')}</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: colors.primary[600], marginTop: 8 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary[800], marginBottom: 12, marginTop: 8, textAlign: 'center' },
  failedTitle: { color: colors.error[500] },
  description: { fontSize: 16, color: colors.primary[700], lineHeight: 24, textAlign: 'center', marginBottom: 8 },
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
