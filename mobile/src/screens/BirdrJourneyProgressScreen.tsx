import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import {
  getBirdrJourney,
  startBirdrJourney,
  type BirdrJourney,
  type JourneyLevel,
} from '../api/birdrJourney';
import { BirdrJourneyRoadmap } from '../components/BirdrJourneyRoadmap';
import { BirdrLevelImage } from '../components/BirdrLevelImage';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import { getCountryDisplayName } from '../i18n/countryNames';
import { colors } from '../theme';

type RouteParams = {
  BirdrJourneyProgress: { countryCode: string };
};

function levelTitle(level: JourneyLevel | null | undefined, locale: string): string {
  if (!level) return '';
  if (locale === 'nl' && level.title_nl?.trim()) return level.title_nl;
  return level.title;
}

function levelDescription(level: JourneyLevel | null | undefined, locale: string): string {
  if (!level) return '';
  if (locale === 'nl' && level.description_nl?.trim()) return level.description_nl;
  return level.description;
}

export function BirdrJourneyProgressScreen() {
  const route = useRoute<RouteProp<RouteParams, 'BirdrJourneyProgress'>>();
  const { countryCode } = route.params;
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [journey, setJourney] = useState<BirdrJourney | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      let data = await getBirdrJourney(countryCode);
      if (!data) {
        data = await startBirdrJourney(countryCode);
      }
      setJourney(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
      setJourney(null);
    } finally {
      setLoading(false);
    }
  }, [countryCode, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handlePlayToday = () => {
    Alert.alert(t('birdr_journey_play_today'), t('birdr_journey_coming_soon'));
  };

  if (loading && !journey) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  if (error || !journey) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? t('failed_load')}</Text>
      </View>
    );
  }

  const countryName = getCountryDisplayName(journey.country, locale);
  const seq = journey.current_sequence;
  const currentTitle = levelTitle(journey.current_level, locale);
  const nextDesc = levelDescription(journey.next_level, locale);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.countryLine}>{countryName}</Text>
      <Text style={styles.levelLine}>
        {t('birdr_journey_level_n', { n: String(seq) })}
        {currentTitle ? ` — ${currentTitle}` : ''}
      </Text>

      {!isAuthenticated && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{t('birdr_journey_guest_save_hint')}</Text>
        </View>
      )}

      <View style={styles.roadmapSection}>
        <BirdrJourneyRoadmap roadmap={journey.roadmap} currentSequence={seq} />
      </View>

      <View style={styles.spotlightRow}>
        <BirdrLevelImage sequence={seq} variant="current" size={160} />
        {journey.next_level != null && (
          <BirdrLevelImage sequence={journey.next_level.sequence} variant="next" size={96} />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('birdr_journey_promotion_hint')}</Text>
        {journey.next_level ? (
          <Text style={styles.cardBody}>
            {t('birdr_journey_next_level_intro', {
              n: String(journey.next_level.sequence),
              title: levelTitle(journey.next_level, locale),
            })}
            {nextDesc ? `\n\n${nextDesc}` : ''}
          </Text>
        ) : (
          <Text style={styles.cardBody}>{t('birdr_journey_max_level')}</Text>
        )}
        <Text style={styles.streakLine}>
          {t('birdr_journey_streak', { days: String(journey.streak_days) })}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.playButton, !journey.can_play_today && styles.playButtonDisabled]}
        onPress={handlePlayToday}
        disabled={!journey.can_play_today}
      >
        <Text style={styles.playButtonText}>{t('birdr_journey_play_today')}</Text>
      </TouchableOpacity>
      <Text style={styles.comingSoon}>{t('birdr_journey_coming_soon')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: colors.primary[600] },
  errorText: { color: colors.error[500], textAlign: 'center', fontSize: 16 },
  countryLine: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[600],
    textAlign: 'center',
  },
  levelLine: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary[800],
    textAlign: 'center',
    marginBottom: 12,
  },
  banner: {
    backgroundColor: colors.warning[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.warning[500],
  },
  bannerText: { fontSize: 14, color: colors.primary[800], lineHeight: 20 },
  roadmapSection: { marginBottom: 8 },
  spotlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.primary[700],
  },
  streakLine: {
    marginTop: 12,
    fontSize: 14,
    color: colors.primary[500],
    fontStyle: 'italic',
  },
  playButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  playButtonDisabled: {
    backgroundColor: colors.primary[300],
  },
  playButtonText: {
    color: colors.primary[50],
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoon: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    color: colors.primary[500],
  },
});
