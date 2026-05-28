import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
  TextInput,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from '../i18n/TranslationContext';
import {
  fetchChecklist,
  type ChecklistResponse,
  type ChecklistSpecies,
} from '../api/checklist';
import { checklistBannerMessage } from '../components/checklist/checklistBanner';
import {
  ChecklistStatusFilter,
  type ChecklistStatusFilterKey,
} from '../components/checklist/ChecklistStatusFilter';
import { ChecklistSpeciesCard } from '../components/checklist/ChecklistSpeciesCard';
import {
  SpeciesMediaModal,
  type SpeciesMediaData,
} from '../components/SpeciesMediaModal';
import { loadCountries, type Country } from '../api/countries';
import { getCountryDisplayName } from '../i18n/countryNames';
import { colors } from '../theme';
import { API_BASE_URL } from '../api/config';

type FilterKey = ChecklistStatusFilterKey | 'very_rare';
type SortKey = 'recent' | 'species' | 'rarity';

function ProgressRing({ percent }: { percent: number }) {
  const size = 72;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.primary[100]}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.primary[600]}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export function ChecklistScreen() {
  const navigation = useNavigation();
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();

  const [data, setData] = useState<ChecklistResponse | null>(null);
  const [species, setSpecies] = useState<ChecklistSpecies[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [taxOrder, setTaxOrder] = useState<string | undefined>();
  const [modalSpecies, setModalSpecies] = useState<SpeciesMediaData | null>(null);
  const [countryCode, setCountryCode] = useState<string | undefined>(undefined);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [taxOrderModalVisible, setTaxOrderModalVisible] = useState(false);

  const effectiveCountryCode = countryCode ?? profile?.country_code ?? undefined;

  useEffect(() => {
    if (!countryModalVisible || countries.length > 0) return;
    loadCountries()
      .then(setCountries)
      .catch(() => {});
  }, [countryModalVisible, countries.length]);

  const countryOptions = useMemo(() => {
    const withDisplay = countries.map((c) => ({
      ...c,
      displayName: getCountryDisplayName(c, locale),
    }));
    withDisplay.sort((a, b) =>
      a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
    );
    return withDisplay;
  }, [countries, locale]);

  const filteredCountryOptions = useMemo(() => {
    if (!countrySearch.trim()) return countryOptions;
    const q = countrySearch.trim().toLowerCase();
    return countryOptions.filter((o) => o.displayName.toLowerCase().includes(q));
  }, [countryOptions, countrySearch]);

  const taxOrderOptions = useMemo(() => {
    const rows = [...(data?.tax_orders ?? [])];
    rows.sort((a, b) => a.tax_order.localeCompare(b.tax_order, undefined, { sensitivity: 'base' }));
    return rows;
  }, [data?.tax_orders]);

  const taxOrderLabel = taxOrder
    ? taxOrderOptions.find((r) => r.tax_order === taxOrder)?.tax_order ?? taxOrder
    : t('checklist_order_all', 'All orders');

  const loadPage = useCallback(
    async (page: number, replace: boolean) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const res = await fetchChecklist({
          status: filter === 'all' ? undefined : filter,
          sort,
          tax_order: taxOrder,
          page,
          page_size: 50,
          language: locale,
          country_code: effectiveCountryCode,
        });
        setData(res);
        setSpecies((prev) => (replace ? res.species : [...prev, ...res.species]));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [isAuthenticated, filter, sort, taxOrder, locale, effectiveCountryCode]
  );

  React.useEffect(() => {
    if (isAuthenticated) loadPage(1, true);
  }, [loadPage, isAuthenticated]);

  const loadMore = () => {
    if (!data?.pagination.has_next || loadingMore) return;
    loadPage(data.pagination.page + 1, false);
  };

  const openSpecies = (s: ChecklistSpecies) => {
    setModalSpecies({
      id: s.id,
      name: s.name,
      name_latin: s.name_latin,
      name_nl: s.name_nl || undefined,
      name_translated: s.name_translated,
      illustration_url: s.illustration_url,
    });
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>{t('checklist_login_required', 'Sign in to view your checklist.')}</Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Login' as never)}>
          <Text style={styles.ctaText}>{t('login', 'Login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (error && !data) {
    const noCountry = error.toLowerCase().includes('country');
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          {noCountry
            ? t('checklist_set_country', 'Set your preferred country in Profile to use the checklist.')
            : error}
        </Text>
        {__DEV__ ? (
          <Text style={styles.devHint}>API: {API_BASE_URL}</Text>
        ) : null}
        {noCountry ? (
          <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Settings' as never)}>
            <Text style={styles.ctaText}>{t('profile', 'Profile')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const progress = data?.progress;
  const totals = data?.totals;
  const statusBanner = checklistBannerMessage(filter);

  const ListHeader = (
    <>
      <View style={styles.progressRow}>
        <View style={styles.ringWrap}>
          <ProgressRing percent={progress?.percent ?? 0} />
          <Text style={styles.ringPercent}>{Math.round(progress?.percent ?? 0)}%</Text>
        </View>
        <View style={styles.progressText}>
          <Text style={styles.title}>{t('checklist_title', 'My Checklist')}</Text>
          {data?.country ? (
            <TouchableOpacity
              onPress={() => setCountryModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('checklist_change_country', 'Change country')}
            >
              <Text style={styles.subtitle}>
                {data.country.name} <Text style={styles.subtitleChevron}>▾</Text>
              </Text>
            </TouchableOpacity>
          ) : null}
          {taxOrderOptions.length > 0 ? (
            <TouchableOpacity
              onPress={() => setTaxOrderModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('checklist_change_order', 'Change order')}
            >
              <Text style={styles.orderSubtitle}>
                {t('checklist_tax_order', 'Order')}: {taxOrderLabel}{' '}
                <Text style={styles.subtitleChevron}>▾</Text>
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.progressLine}>
            {t('checklist_progress', '{identified} / {total} birds identified')
              .replace('{identified}', String(progress?.identified_count ?? 0))
              .replace('{total}', String(progress?.total_count ?? 0))}
          </Text>
          {progress?.next_milestone != null ? (
            <Text style={styles.milestone}>
              {t('checklist_next_milestone', 'Next milestone: {n} birds').replace(
                '{n}',
                String(progress.next_milestone)
              )}
            </Text>
          ) : null}
        </View>
      </View>

      {totals ? (
        <ChecklistStatusFilter
          value={filter === 'very_rare' ? 'all' : filter}
          onChange={setFilter}
          totals={totals}
          t={t}
        />
      ) : null}

      <View style={styles.banner}>
        <Text style={styles.bannerText}>{t(statusBanner.key, statusBanner.fallback)}</Text>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>{t('checklist_sort', 'Sort')}</Text>
        {(['recent', 'species', 'rarity'] as SortKey[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sortChip, sort === s && styles.sortChipActive]}
            onPress={() => setSort(s)}
          >
            <Text style={[styles.sortChipText, sort === s && styles.sortChipTextActive]}>
              {s === 'recent'
                ? t('checklist_sort_recent', 'Recent')
                : s === 'species'
                  ? t('checklist_sort_species', 'Species')
                  : t('checklist_sort_rarity', 'Rarity')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendItem}>✓ {t('checklist_legend_seen', 'Seen')}</Text>
        <Text style={styles.legendItem}>○ {t('checklist_legend_missed', 'Missed')}</Text>
        <Text style={styles.legendItem}>? {t('checklist_legend_unseen', 'Unseen')}</Text>
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={species}
        keyExtractor={(item) => String(item.id)}
        numColumns={1}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!data}
            onRefresh={() => loadPage(1, true)}
            tintColor={colors.primary[600]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary[600]} />
          ) : null
        }
        renderItem={({ item }) => (
          <ChecklistSpeciesCard species={item} onPress={() => openSpecies(item)} t={t} />
        )}
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={taxOrderModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.countryModalBackdrop}
          onPress={() => setTaxOrderModalVisible(false)}
        >
          <Pressable style={styles.countryModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.countryModalTitle}>
              {t('checklist_select_order', 'Select order')}
            </Text>
            <FlatList
              data={[
                { tax_order: '', count: 0 },
                ...taxOrderOptions,
              ]}
              keyExtractor={(row) => row.tax_order || '_all'}
              renderItem={({ item }) => {
                const isAll = !item.tax_order;
                const selected = isAll ? !taxOrder : taxOrder === item.tax_order;
                return (
                  <TouchableOpacity
                    style={[styles.countryModalItem, selected && styles.countryModalItemSelected]}
                    onPress={() => {
                      setTaxOrder(isAll ? undefined : item.tax_order);
                      setTaxOrderModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.countryModalItemText,
                        selected && styles.countryModalItemTextSelected,
                      ]}
                    >
                      {isAll
                        ? t('checklist_order_all', 'All orders')
                        : `${item.tax_order} (${item.count})`}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.countryModalClose}
              onPress={() => setTaxOrderModalVisible(false)}
            >
              <Text style={styles.countryModalCloseText}>{t('close', 'Close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={countryModalVisible} transparent animationType="slide">
        <Pressable
          style={styles.countryModalBackdrop}
          onPress={() => {
            setCountryModalVisible(false);
            setCountrySearch('');
          }}
        >
          <Pressable style={styles.countryModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.countryModalTitle}>
              {t('checklist_select_country', 'Select country')}
            </Text>
            <TextInput
              style={styles.countrySearchInput}
              placeholder={t('search', 'Search')}
              placeholderTextColor={colors.primary[400]}
              value={countrySearch}
              onChangeText={setCountrySearch}
            />
            <FlatList
              data={filteredCountryOptions}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryModalItem,
                    effectiveCountryCode === item.code && styles.countryModalItemSelected,
                  ]}
                  onPress={() => {
                    setCountryCode(item.code);
                    setCountryModalVisible(false);
                    setCountrySearch('');
                  }}
                >
                  <Text
                    style={[
                      styles.countryModalItemText,
                      effectiveCountryCode === item.code && styles.countryModalItemTextSelected,
                    ]}
                  >
                    {item.displayName}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.countryModalClose}
              onPress={() => {
                setCountryModalVisible(false);
                setCountrySearch('');
              }}
            >
              <Text style={styles.countryModalCloseText}>{t('close', 'Close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <SpeciesMediaModal
        visible={!!modalSpecies}
        onClose={() => setModalSpecies(null)}
        species={modalSpecies}
        language={locale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f0e8' },
  listContent: { paddingBottom: 24 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f0e8',
  },
  message: { fontSize: 16, color: colors.primary[800], textAlign: 'center', marginBottom: 16 },
  devHint: { fontSize: 12, color: colors.primary[500], textAlign: 'center', marginBottom: 12 },
  cta: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  ringWrap: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },
  ringPercent: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary[800],
  },
  progressText: { flex: 1, marginLeft: 12 },
  title: { fontSize: 22, fontWeight: '800', color: colors.primary[900] },
  subtitle: { fontSize: 14, color: colors.primary[600], marginTop: 2 },
  orderSubtitle: { fontSize: 13, color: colors.primary[600], marginTop: 4 },
  subtitleChevron: { fontSize: 12, color: colors.primary[500] },
  progressLine: { fontSize: 13, color: colors.primary[700], marginTop: 6 },
  milestone: { fontSize: 12, color: colors.primary[500], marginTop: 4 },
  banner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[400],
  },
  bannerText: { fontSize: 12, color: colors.primary[800], lineHeight: 18 },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  sortLabel: { fontSize: 13, fontWeight: '600', color: colors.primary[700], marginRight: 4 },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  sortChipActive: { backgroundColor: colors.primary[500] },
  sortChipText: { fontSize: 14, color: colors.primary[700], fontWeight: '600' },
  sortChipTextActive: { color: '#fff' },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  legendItem: { fontSize: 11, color: colors.primary[600] },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.primary[900], marginBottom: 12 },
  sheetSection: { fontSize: 13, fontWeight: '600', color: colors.primary[600] },
  sheetRow: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.primary[50] },
  sheetRowSelected: {
    backgroundColor: colors.primary[600],
    borderRadius: 8,
    borderBottomColor: colors.primary[600],
  },
  sheetRowText: { fontSize: 15, color: colors.primary[800] },
  sheetRowTextSelected: { fontWeight: '700', color: '#fff' },
  countryModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  countryModalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '70%', padding: 16 },
  countryModalTitle: { fontSize: 18, fontWeight: '700', color: colors.primary[800], marginBottom: 12 },
  countrySearchInput: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: colors.primary[800],
    marginBottom: 8,
  },
  countryModalItem: { paddingVertical: 14, paddingHorizontal: 8 },
  countryModalItemSelected: { backgroundColor: colors.primary[100] },
  countryModalItemText: { fontSize: 16, color: colors.primary[800] },
  countryModalItemTextSelected: { fontWeight: '600', color: colors.primary[700] },
  countryModalClose: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  countryModalCloseText: { fontSize: 16, color: colors.primary[500], fontWeight: '600' },
});
