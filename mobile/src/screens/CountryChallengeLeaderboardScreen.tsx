import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchCountryChallengeLeaderboard,
  type CountryChallengeLeaderboardRow,
} from '../api/birdrJourney';
import { BirdrLevelImage } from '../components/BirdrLevelImage';
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

function leaderboardLevelTitle(row: CountryChallengeLeaderboardRow, locale: string): string {
  if (locale === 'nl' && row.level_title_nl?.trim()) return row.level_title_nl;
  return row.level_title;
}

function stepLabel(row: CountryChallengeLeaderboardRow): string {
  if (row.step_total) {
    return `${row.step_label} / ${row.step_total}`;
  }
  return row.step_label;
}

export function CountryChallengeLeaderboardScreen() {
  const { t, locale } = useTranslation();
  const [rows, setRows] = useState<CountryChallengeLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    setError(null);
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      setRows(await fetchCountryChallengeLeaderboard());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />
      }
    >
      <Text style={styles.hint}>{t('country_challenge_leaderboard_hint')}</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary[500]} style={styles.loader} />
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <Text style={styles.muted}>{t('country_challenge_leaderboard_empty')}</Text>
      ) : null}

      {rows.map((row, index) => {
        const code = row.country_code?.trim() ?? '';
        const countryLabel = getCountryDisplayName(
          { code, name: row.country_name },
          locale
        );
        return (
          <View key={`${row.player_name}-${code}-${index}`} style={styles.card}>
            <View style={styles.rankRow}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <Text style={styles.playerName}>{row.player_name}</Text>
            </View>
            <Text style={styles.countryLine}>
              {countryCodeToFlag(code)} {code} · {countryLabel}
            </Text>
            <View style={styles.levelRow}>
              <BirdrLevelImage iconUrl={row.level_icon_url} variant="completed" size={44} />
              <View style={styles.levelText}>
                <Text style={styles.levelTitle}>{leaderboardLevelTitle(row, locale)}</Text>
                <Text style={styles.stepText}>{stepLabel(row)}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[50] },
  content: { padding: 24, paddingBottom: 48 },
  hint: { fontSize: 14, color: colors.primary[600], marginBottom: 20, lineHeight: 20 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  loader: { marginVertical: 24 },
  muted: { fontSize: 14, color: colors.primary[600] },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  rank: { fontSize: 14, fontWeight: '700', color: colors.primary[600], minWidth: 28 },
  playerName: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.primary[800] },
  countryLine: { fontSize: 14, color: colors.primary[700], marginBottom: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelText: { flex: 1, minWidth: 0 },
  levelTitle: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  stepText: { fontSize: 14, color: colors.primary[600], marginTop: 2 },
});
