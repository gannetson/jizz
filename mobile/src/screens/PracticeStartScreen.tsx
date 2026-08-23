import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from '../i18n/TranslationContext';
import { useGame } from '../context/GameContext';
import { SpeciesCoverThumb } from '../components/SpeciesCoverThumb';
import { CountrySelect } from '../components/CountrySelect';
import { loadCountries, type Country } from '../api/countries';
import {
  fetchSpeciesBySlug,
  parseComparePairSlug,
  type SpeciesSlugInfo,
} from '../api/fetchSpeciesDetail';
import { startConfusionPairPractice, startSpeciesPractice } from '../api/practice';
import * as playerApi from '../api/player';
import { colors } from '../theme';

type SpeciesRoute = RouteProp<{ SpeciesPractice: { slug: string } }, 'SpeciesPractice'>;
type PairRoute = RouteProp<{ PairPractice: { pair: string } }, 'PairPractice'>;

function displayName(row: SpeciesSlugInfo | null): string {
  return row?.name_translated || row?.name || '';
}

function PracticeStartBody({
  mode,
  slug,
  pair,
}: {
  mode: 'species' | 'pair';
  slug?: string;
  pair?: string;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const { loadGame, setGame, setPlayer } = useGame();

  const speciesLanguage = useMemo(
    () => (profile?.language?.trim() || locale).toLowerCase(),
    [profile?.language, locale],
  );

  const [left, setLeft] = useState<SpeciesSlugInfo | null>(null);
  const [right, setRight] = useState<SpeciesSlugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [country, setCountry] = useState<Country | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    if (!isAuthenticated || countries.length > 0) return;
    loadCountries()
      .then(setCountries)
      .catch(() => {});
  }, [isAuthenticated, countries.length]);

  const effectiveCountry = useMemo(() => {
    if (country) return country;
    const code = profile?.country_code?.trim()?.toUpperCase();
    if (!code) return null;
    return countries.find((c) => c.code === code) ?? { code, name: code };
  }, [country, profile?.country_code, countries]);

  const effectiveCountryCode = effectiveCountry?.code;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    const load = async () => {
      try {
        if (mode === 'species') {
          if (!slug) {
            if (!cancelled) setNotFound(true);
            return;
          }
          const data = await fetchSpeciesBySlug(slug, speciesLanguage);
          if (!cancelled) setLeft(data);
        } else {
          const parsed = pair ? parseComparePairSlug(pair) : null;
          if (!parsed) {
            if (!cancelled) setNotFound(true);
            return;
          }
          const [a, b] = await Promise.all([
            fetchSpeciesBySlug(parsed[0], speciesLanguage),
            fetchSpeciesBySlug(parsed[1], speciesLanguage),
          ]);
          if (!cancelled) {
            setLeft(a);
            setRight(b);
          }
        }
      } catch {
        if (!cancelled) {
          setLeft(null);
          setRight(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [mode, slug, pair, speciesLanguage]);

  const handleStart = useCallback(async () => {
    if (!left) return;
    setStarting(true);
    setError(null);
    try {
      const result =
        mode === 'species'
          ? await startSpeciesPractice(left.id, effectiveCountryCode)
          : right
            ? await startConfusionPairPractice(left.id, right.id, effectiveCountryCode)
            : null;
      if (!result) return;
      const player = await playerApi.getPlayer(result.player_token);
      if (player) setPlayer(player);
      const game = await loadGame(result.game.token);
      if (game) {
        setGame(game);
        navigation.navigate('GamePlay' as never);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
    } finally {
      setStarting(false);
    }
  }, [
    left,
    right,
    mode,
    effectiveCountryCode,
    loadGame,
    navigation,
    setGame,
    setPlayer,
    t,
  ]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>{t('practice_not_found')}</Text>
      </View>
    );
  }

  const leftName = displayName(left);
  const rightName = displayName(right);
  const blurb =
    mode === 'species'
      ? t('practice_species_blurb').replace('{name}', leftName)
      : t('practice_pair_blurb').replace('{name1}', leftName).replace('{name2}', rightName);

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      {left ? (
        <View style={styles.thumbs}>
          <View style={styles.speciesBlock}>
            <SpeciesCoverThumb speciesId={left.id} size={64} alt={leftName} />
            <View style={styles.speciesText}>
              <Text style={styles.name}>{leftName}</Text>
              <Text style={styles.latin}>{left.name_latin}</Text>
            </View>
          </View>
          {right ? (
            <>
              <Text style={styles.vs}>vs</Text>
              <View style={styles.speciesBlock}>
                <SpeciesCoverThumb speciesId={right.id} size={64} alt={rightName} />
                <View style={styles.speciesText}>
                  <Text style={styles.name}>{rightName}</Text>
                  <Text style={styles.latin}>{right.name_latin}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.blurb}>{blurb}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!isAuthenticated ? (
        <>
          <Text style={styles.muted}>{t('practice_login')}</Text>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => navigation.navigate('Login' as never)}
          >
            <Text style={styles.ctaText}>{t('login')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {countries.length > 0 ? (
            <CountrySelect
              value={effectiveCountry}
              onChange={setCountry}
              countries={countries}
              title={t('trouble_spots_select_country')}
            />
          ) : (
            <Text style={styles.muted}>{t('practice_set_country')}</Text>
          )}
          <TouchableOpacity
            style={[styles.cta, (!effectiveCountryCode || starting) && styles.ctaDisabled]}
            onPress={() => void handleStart()}
            disabled={!effectiveCountryCode || starting}
          >
            {starting ? (
              <ActivityIndicator color={colors.primary[50]} />
            ) : (
              <Text style={styles.ctaText}>{t('practice_start')}</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

export function SpeciesPracticeScreen() {
  const route = useRoute<SpeciesRoute>();
  return <PracticeStartBody mode="species" slug={route.params?.slug} />;
}

export function PairPracticeScreen() {
  const route = useRoute<PairRoute>();
  return <PracticeStartBody mode="pair" pair={route.params?.pair} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  body: {
    padding: 20,
    gap: 16,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  thumbs: {
    gap: 12,
  },
  speciesBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  speciesText: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '700', color: colors.primary[800] },
  latin: { fontSize: 13, fontStyle: 'italic', color: colors.primary[600], marginTop: 2 },
  vs: { fontSize: 14, color: colors.primary[600], marginLeft: 76 },
  blurb: { fontSize: 16, color: colors.primary[800], lineHeight: 22 },
  muted: { fontSize: 16, color: colors.primary[700], lineHeight: 22 },
  error: { fontSize: 14, color: '#b00020' },
  cta: {
    marginTop: 8,
    backgroundColor: colors.primary[600],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ctaDisabled: { opacity: 0.7 },
  ctaText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
});
