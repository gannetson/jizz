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
  SpeciesMediaModal,
  type SpeciesMediaData,
} from '../components/SpeciesMediaModal';
import { SpeciesCoverThumb } from '../components/SpeciesCoverThumb';
import {
  fetchTroubleSpots,
  startConfusionPairPractice,
  startSpeciesPractice,
  type TroubleSpotPair,
  type TroubleSpotSpecies,
} from '../api/practice';
import * as playerApi from '../api/player';
import { colors } from '../theme';

type TabKey = 'species' | 'pairs';

function formatRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate)}%`;
}

export function TroubleSpotsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, object | undefined>>>();
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();
  const { loadGame, setGame, setPlayer } = useGame();

  const [activeTab, setActiveTab] = useState<TabKey>('species');
  const [species, setSpecies] = useState<TroubleSpotSpecies[]>([]);
  const [pairs, setPairs] = useState<TroubleSpotPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingPairKey, setStartingPairKey] = useState<string | null>(null);
  const [startingSpeciesId, setStartingSpeciesId] = useState<number | null>(null);
  const [modalSpecies, setModalSpecies] = useState<SpeciesMediaData | null>(null);

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

  const handlePracticeSpecies = async (speciesId: number) => {
    setStartingSpeciesId(speciesId);
    setError(null);
    try {
      const result = await startSpeciesPractice(speciesId, countryCode);
      const p = await playerApi.getPlayer(result.player_token);
      if (p) setPlayer(p);
      const game = await loadGame(result.game.token);
      if (game) {
        setGame(game);
        setModalSpecies(null);
        navigation.navigate('GamePlay' as never);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
    } finally {
      setStartingSpeciesId(null);
    }
  };

  const openSpecies = (row: TroubleSpotSpecies) => {
    setModalSpecies({
      id: row.species_id,
      name: row.name,
      name_latin: row.name_latin,
      name_translated: row.name,
      illustration_url: row.illustration_url,
    });
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'species', label: t('trouble_spots_species_title'), count: species.length },
    { key: 'pairs', label: t('trouble_spots_pairs_title'), count: pairs.length },
  ];

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

  return (
    <View style={styles.root}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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

        {activeTab === 'species' ? (
          species.length === 0 ? (
            <Text style={styles.muted}>{t('trouble_spots_no_species')}</Text>
          ) : (
            species.map((row) => {
              const busy = startingSpeciesId === row.species_id;
              return (
                <View key={row.species_id} style={styles.speciesRow}>
                  <TouchableOpacity
                    style={styles.speciesRowMain}
                    onPress={() => openSpecies(row)}
                    accessibilityRole="button"
                  >
                    <SpeciesCoverThumb
                      speciesId={row.species_id}
                      initialUrl={row.illustration_url}
                      size={48}
                      alt={row.name}
                    />
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{row.name}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>{row.name_latin}</Text>
                      <Text style={styles.rowStatCompact} numberOfLines={1}>
                        {t('trouble_spots_correct_rate').replace('{rate}', formatRate(row.correct_rate))}
                        {' · '}
                        {t('trouble_spots_wrong_rate')
                          .replace('{wrong}', String(row.wrongly_answered))
                          .replace('{shown}', String(row.times_shown))
                          .replace('{rate}', formatRate(row.error_rate))}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.practiceButtonCompact, busy && styles.practiceButtonDisabled]}
                    onPress={() => void handlePracticeSpecies(row.species_id)}
                    disabled={busy || startingSpeciesId != null}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color={colors.primary[50]} />
                    ) : (
                      <Text style={styles.practiceButtonTextCompact}>
                        {t('trouble_spots_practice_species')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )
        ) : pairs.length === 0 ? (
          <Text style={styles.muted}>{t('trouble_spots_no_pairs')}</Text>
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
      </ScrollView>

      <SpeciesMediaModal
        visible={!!modalSpecies}
        onClose={() => setModalSpecies(null)}
        species={modalSpecies}
        language={locale}
        showPracticeButton
        onPractice={(speciesId) => void handlePracticeSpecies(speciesId)}
        practiceLoading={startingSpeciesId === modalSpecies?.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary[100],
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary[600] },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[700],
    textAlign: 'center',
  },
  tabTextActive: { color: colors.primary[50] },
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
    paddingTop: 8,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[200],
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[200],
  },
  speciesRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  pairCard: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.primary[200],
    gap: 10,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.primary[800] },
  rowSub: { fontSize: 12, color: colors.primary[600], marginTop: 1 },
  rowStat: { fontSize: 13, color: colors.primary[700], textAlign: 'right', maxWidth: 120 },
  rowStatCompact: { fontSize: 11, color: colors.primary[600], marginTop: 2 },
  practiceButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[600],
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  practiceButtonDisabled: { opacity: 0.7 },
  practiceButtonText: { color: colors.primary[50], fontSize: 15, fontWeight: '600' },
  practiceButtonCompact: {
    flexShrink: 0,
    backgroundColor: colors.primary[600],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 72,
    alignItems: 'center',
  },
  practiceButtonTextCompact: { color: colors.primary[50], fontSize: 13, fontWeight: '600' },
});
