import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from '../i18n/TranslationContext';
import { useGame } from '../context/GameContext';
import {
  fetchTroubleSpots,
  startConfusionPairPractice,
  type TroubleSpotPair,
  type TroubleSpotSpecies,
} from '../api/practice';
import * as playerApi from '../api/player';
import { colors } from '../theme';

function formatRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate)}%`;
}

export function TroubleSpotsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const { loadGame, setGame, setPlayer } = useGame();

  const [species, setSpecies] = useState<TroubleSpotSpecies[]>([]);
  const [pairs, setPairs] = useState<TroubleSpotPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingPairKey, setStartingPairKey] = useState<string | null>(null);

  const countryCode = profile?.country_code?.trim()?.toUpperCase();

  const load = useCallback(async (showRefresh = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await fetchTroubleSpots(countryCode);
      setSpecies(data.species);
      setPairs(data.pairs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
      setSpecies([]);
      setPairs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, countryCode, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handlePracticePair = async (pair: TroubleSpotPair) => {
    const key = `${pair.low_id}-${pair.high_id}`;
    setStartingPairKey(key);
    setError(null);
    try {
      const result = await startConfusionPairPractice(pair.low_id, pair.high_id, countryCode);
      const p = await playerApi.getPlayer(result.player_token);
      if (p) setPlayer(p);
      const game = await loadGame(result.game.token);
      if (game) {
        setGame(game);
        navigation.navigate('GamePlay' as never);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
    } finally {
      setStartingPairKey(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>{t('trouble_spots_login')}</Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Login' as never)}>
          <Text style={styles.ctaText}>{t('login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const empty = species.length === 0 && pairs.length === 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
      }
    >
      {!countryCode && (
        <Text style={styles.hint}>{t('trouble_spots_set_country')}</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {empty ? (
        <Text style={styles.muted}>{t('trouble_spots_empty')}</Text>
      ) : (
        <>
          <Text style={styles.sectionTitle}>{t('trouble_spots_species_title')}</Text>
          {species.length === 0 ? (
            <Text style={styles.mutedSmall}>{t('trouble_spots_no_species')}</Text>
          ) : (
            species.map((row) => (
              <View key={row.species_id} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{row.name}</Text>
                  <Text style={styles.rowSub}>{row.name_latin}</Text>
                </View>
                <Text style={styles.rowStat}>
                  {t('trouble_spots_wrong_rate')
                    .replace('{wrong}', String(row.wrongly_answered))
                    .replace('{shown}', String(row.times_shown))
                    .replace('{rate}', formatRate(row.error_rate))}
                </Text>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, styles.sectionGap]}>
            {t('trouble_spots_pairs_title')}
          </Text>
          {pairs.length === 0 ? (
            <Text style={styles.mutedSmall}>{t('trouble_spots_no_pairs')}</Text>
          ) : (
            pairs.map((pair) => {
              const key = `${pair.low_id}-${pair.high_id}`;
              const busy = startingPairKey === key;
              return (
                <View key={key} style={styles.pairCard}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>
                      {pair.low_name} · {pair.high_name}
                    </Text>
                    <Text style={styles.rowSub}>
                      {t('trouble_spots_pair_wrong').replace('{count}', String(pair.total_wrong))}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.practiceButton, busy && styles.practiceButtonDisabled]}
                    onPress={() => void handlePracticePair(pair)}
                    disabled={busy || startingPairKey != null}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.primary[50]} />
                    ) : (
                      <Text style={styles.practiceButtonText}>{t('trouble_spots_practice_pair')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  hint: {
    fontSize: 14,
    color: colors.primary[700],
    marginBottom: 12,
    lineHeight: 20,
  },
  muted: {
    fontSize: 16,
    color: colors.primary[700],
    textAlign: 'center',
    lineHeight: 22,
  },
  mutedSmall: {
    fontSize: 14,
    color: colors.primary[600],
    marginBottom: 8,
    lineHeight: 20,
  },
  error: {
    fontSize: 14,
    color: '#b00020',
    marginBottom: 12,
  },
  cta: {
    marginTop: 16,
    backgroundColor: colors.primary[600],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  ctaText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 10,
  },
  sectionGap: { marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[200],
  },
  pairCard: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[200],
    gap: 10,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  rowSub: { fontSize: 13, color: colors.primary[600], marginTop: 2 },
  rowStat: { fontSize: 13, color: colors.primary[700], textAlign: 'right', maxWidth: 120 },
  practiceButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[600],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  practiceButtonDisabled: { opacity: 0.7 },
  practiceButtonText: { color: colors.primary[50], fontSize: 15, fontWeight: '600' },
});
