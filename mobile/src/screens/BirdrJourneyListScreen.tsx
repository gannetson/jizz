import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  listBirdrJourneys,
  deleteBirdrJourney,
  getStoredBirdrJourneyCountryCode,
  setStoredBirdrJourneyCountryCode,
  clearStoredBirdrJourneyCountryCode,
  getStoredBirdrJourneyPlayerToken,
  clearStoredBirdrJourneyPlayerToken,
  createBirdrJourneyPlayer,
  type BirdrJourney,
  type JourneyLevel,
} from '../api/birdrJourney';
import { BirdrLevelImage } from '../components/BirdrLevelImage';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import { getCountryDisplayName } from '../i18n/countryNames';
import { colors } from '../theme';

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const base = 0x1f1e6;
  const c1 = code.charCodeAt(0) - 65;
  const c2 = code.charCodeAt(1) - 65;
  if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return code;
  return String.fromCodePoint(base + c1, base + c2);
}

function levelTitle(level: JourneyLevel | null | undefined, locale: string): string {
  if (!level) return '';
  if (locale === 'nl' && level.title_nl?.trim()) return level.title_nl;
  return level.title;
}

export function BirdrJourneyListScreen() {
  const navigation = useNavigation();
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [journeys, setJourneys] = useState<BirdrJourney[]>([]);
  const [activeCountryCode, setActiveCountryCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const ensureAuth = useCallback(async (): Promise<boolean> => {
    if (isAuthenticated) return true;
    const token = await getStoredBirdrJourneyPlayerToken();
    if (token) return true;
    try {
      await createBirdrJourneyPlayer('Guest', locale === 'nl' ? 'nl' : 'en');
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('failed_load');
      setError(msg);
      return false;
    }
  }, [isAuthenticated, locale, t]);

  const load = useCallback(async () => {
    setError(null);
    const ok = await ensureAuth();
    if (!ok) {
      setJourneys([]);
      setLoading(false);
      return;
    }
    try {
      const list = await listBirdrJourneys();
      const storedCountry = await getStoredBirdrJourneyCountryCode();
      setJourneys(list);
      setActiveCountryCode(storedCountry?.trim()?.toUpperCase() ?? null);
    } catch (e: unknown) {
      await clearStoredBirdrJourneyCountryCode();
      await clearStoredBirdrJourneyPlayerToken();
      try {
        if (!isAuthenticated) {
          await createBirdrJourneyPlayer('Guest', locale === 'nl' ? 'nl' : 'en');
        }
        const list = await listBirdrJourneys();
        const storedCountry = await getStoredBirdrJourneyCountryCode();
        setJourneys(list);
        setActiveCountryCode(storedCountry?.trim()?.toUpperCase() ?? null);
      } catch (retryError: unknown) {
        setError(retryError instanceof Error ? retryError.message : t('failed_load'));
        setJourneys([]);
      }
    } finally {
      setLoading(false);
    }
  }, [ensureAuth, isAuthenticated, locale, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleContinue = async (journey: BirdrJourney) => {
    const code = journey.country.code;
    await setStoredBirdrJourneyCountryCode(code);
    (navigation as any).navigate('BirdrJourneyProgress', { countryCode: code });
  };

  const handleRemove = (journey: BirdrJourney) => {
    const countryName = getCountryDisplayName(journey.country, locale);
    Alert.alert(
      t('country_challenge_remove_title'),
      t('country_challenge_remove_confirm', { country: countryName }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('remove'),
          style: 'destructive',
          onPress: async () => {
            setRemovingId(journey.id);
            try {
              await deleteBirdrJourney(journey.id);
              if (activeCountryCode === journey.country.code) {
                await clearStoredBirdrJourneyCountryCode();
                setActiveCountryCode(null);
              }
              await load();
            } catch (e: unknown) {
              Alert.alert(
                t('country_challenge'),
                e instanceof Error ? e.message : t('failed_load')
              );
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const handleStartNew = () => {
    (navigation as any).navigate('BirdrJourneyCountry');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.hint}>{t('country_challenges_overview_hint')}</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.primaryButton} onPress={handleStartNew} testID="journey.startNew">
        <Text style={styles.primaryButtonText}>{t('new_country_challenge')}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>{t('my_country_challenges')}</Text>

      {loading && journeys.length === 0 ? (
        <ActivityIndicator size="small" color={colors.primary[500]} style={styles.loader} />
      ) : journeys.length === 0 ? (
        <Text style={styles.muted}>{t('no_country_challenges_yet')}</Text>
      ) : (
        journeys.map((journey) => {
          const code = journey.country.code;
          const flag = countryCodeToFlag(code);
          const countryName = getCountryDisplayName(journey.country, locale);
          const level = levelTitle(journey.current_level, locale);
          const isActive = activeCountryCode === code;
          const statusLabel = journey.is_champion
            ? t('country_challenge_champion')
            : t('country_challenge_in_progress');

          return (
            <View key={journey.id} style={[styles.card, isActive && styles.cardActive]}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => void handleContinue(journey)}
                testID={`journey.continue.${code}`}
              >
                <BirdrLevelImage
                  iconUrl={journey.current_level?.icon_url}
                  variant={journey.is_champion ? 'current' : 'current'}
                  size={56}
                />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {flag ? `${flag} ` : ''}{countryName}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {level || statusLabel}
                  </Text>
                  <Text style={styles.cardStatus}>{statusLabel}</Text>
                  {isActive ? (
                    <Text style={styles.activeBadge}>{t('country_challenge_active')}</Text>
                  ) : null}
                </View>
                <Text style={styles.continueLabel}>{t('continue')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemove(journey)}
                disabled={removingId === journey.id}
                testID={`journey.remove.${code}`}
              >
                {removingId === journey.id ? (
                  <ActivityIndicator size="small" color={colors.error[500]} />
                ) : (
                  <Text style={styles.removeButtonText}>{t('remove')}</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  content: { padding: 24, paddingBottom: 48 },
  hint: { fontSize: 14, color: colors.primary[600], marginBottom: 20, lineHeight: 20 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.primary[800], marginBottom: 12 },
  loader: { marginVertical: 24 },
  muted: { fontSize: 14, color: colors.primary[600] },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: colors.primary[400],
    borderWidth: 2,
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.primary[800] },
  cardMeta: { fontSize: 14, color: colors.primary[700], marginTop: 2 },
  cardStatus: { fontSize: 13, color: colors.primary[600], marginTop: 4 },
  activeBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[500],
    marginTop: 4,
  },
  continueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
  removeButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primary[200],
    paddingVertical: 10,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error[500],
  },
});
