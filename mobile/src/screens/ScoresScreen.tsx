import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { loadScores, Score } from '../api/scores';
import { loadCountries } from '../api/countries';
import type { Country } from '../api/countries';
import { colors } from '../theme';

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  const a = 0x1f1e6;
  const c1 = code.charCodeAt(0) - 65;
  const c2 = code.charCodeAt(1) - 65;
  if (c1 < 0 || c1 > 25 || c2 < 0 || c2 > 25) return code;
  return String.fromCodePoint(a + c1, a + c2);
}

const MEDIA_LABELS: Record<string, string> = {
  images: 'Images',
  audio: 'Sounds',
  video: 'Videos',
};

const MEDIA_ICON: Record<string, string> = {
  images: '📷',
  audio: '🔊',
  video: '🎥',
};

const LEVEL_OPTIONS = [
  { value: '', label: 'Any level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];

const LENGTH_OPTIONS = [
  { value: '', label: 'Any length' },
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

const MEDIA_OPTIONS = [
  { value: '', label: 'Any media' },
  { value: 'images', label: 'Images' },
  { value: 'audio', label: 'Sounds' },
  { value: 'video', label: 'Videos' },
];

type FilterSelectProps<T> = {
  label: string;
  value: T;
  displayLabel: string;
  onSelect: (value: T) => void;
  options: { value: T; label: string }[];
};

function FilterSelect<T extends string>({ label, value, displayLabel, onSelect, options }: FilterSelectProps<T>) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.filterButtonValue} numberOfLines={1}>{displayLabel}</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value || 'any'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item.value === value && styles.modalItemSelected]}
                  onPress={() => {
                    onSelect(item.value);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, item.value === value && styles.modalItemTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function ScoreCard({ score }: { score: Score }) {
  const flag = countryCodeToFlag(score.country?.code ?? '');
  const mediaIcon = MEDIA_ICON[score.media] ?? '?';
  const mediaLabel = MEDIA_LABELS[score.media] ?? score.media;
  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <Text style={styles.cardRank}>#{score.ranking}</Text>
        <View style={styles.cardCenter}>
          <Text style={styles.cardName} numberOfLines={1}>{score.name}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.cardMetaText}>{flag} {score.country?.name ?? ''}</Text>
            <Text style={styles.cardMetaDot}> · </Text>
            <Text style={styles.cardMetaText}>{mediaIcon} {mediaLabel}</Text>
            <Text style={styles.cardMetaDot}> · </Text>
            <Text style={styles.cardMetaText}>{score.level} · {score.length} q</Text>
          </View>
        </View>
        <Text style={styles.cardScore}>{score.score}</Text>
      </View>
    </View>
  );
}

export function ScoresScreen() {
  const [scores, setScores] = useState<Score[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState<Country | null>(null);
  const [level, setLevel] = useState('');
  const [length, setLength] = useState('');
  const [media, setMedia] = useState('');

  useEffect(() => {
    loadCountries().then((list) => setCountries(list));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadScores({
      country: country?.code ?? undefined,
      level: level || undefined,
      length: length || undefined,
      media: media || undefined,
    })
      .then(setScores)
      .finally(() => setLoading(false));
  }, [country, level, length, media]);

  const countryOptions = [
    { value: '', label: 'All countries' },
    ...countries.map((c) => ({ value: c.code, label: c.name })),
  ];

  const countryDisplayLabel = country ? country.name : 'All countries';
  const levelDisplayLabel = LEVEL_OPTIONS.find((o) => o.value === level)?.label ?? 'Any level';
  const lengthDisplayLabel = LENGTH_OPTIONS.find((o) => o.value === length)?.label ?? 'Any length';
  const mediaDisplayLabel = MEDIA_OPTIONS.find((o) => o.value === media)?.label ?? 'Any media';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>High scores</Text>

      <View style={styles.filterRow}>
        <FilterSelect
          label="Country"
          value={country?.code ?? ''}
          displayLabel={countryDisplayLabel}
          onSelect={(code) => setCountry(code ? countries.find((c) => c.code === code) ?? null : null)}
          options={countryOptions}
        />
        <FilterSelect
          label="Media"
          value={media}
          displayLabel={mediaDisplayLabel}
          onSelect={setMedia}
          options={MEDIA_OPTIONS}
        />
      </View>
      <View style={styles.filterRow}>
        <FilterSelect
          label="Level"
          value={level}
          displayLabel={levelDisplayLabel}
          onSelect={setLevel}
          options={LEVEL_OPTIONS}
        />
        <FilterSelect
          label="Length"
          value={length}
          displayLabel={lengthDisplayLabel}
          onSelect={setLength}
          options={LENGTH_OPTIONS}
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : scores.length === 0 ? (
        <Text style={styles.empty}>No scores found.</Text>
      ) : (
        <View style={styles.list}>
          {scores.map((s, i) => (
            <ScoreCard key={`${s.ranking}-${s.name}-${s.score}-${i}`} score={s} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 16 },
  filterRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary[200],
    backgroundColor: colors.primary[50],
  },
  filterButtonLabel: { fontSize: 12, fontWeight: '600', color: colors.primary[600], marginBottom: 2 },
  filterButtonValue: { fontSize: 15, color: colors.primary[800], fontWeight: '500' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '70%', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.primary[800], marginBottom: 12 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 12 },
  modalItemSelected: { backgroundColor: colors.primary[100], borderRadius: 8 },
  modalItemText: { fontSize: 16, color: colors.primary[800] },
  modalItemTextSelected: { fontWeight: '600', color: colors.primary[700] },
  modalClose: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: colors.primary[500], fontWeight: '600' },
  loading: { paddingVertical: 40, alignItems: 'center' },
  empty: { fontSize: 16, color: colors.primary[600], marginTop: 16 },
  list: { marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
    padding: 14,
    marginBottom: 10,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center' },
  cardRank: { fontSize: 16, fontWeight: '700', color: colors.primary[600], width: 36 },
  cardCenter: { flex: 1, minWidth: 0, marginHorizontal: 10 },
  cardName: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4 },
  cardMetaText: { fontSize: 13, color: colors.primary[600] },
  cardMetaDot: { fontSize: 13, color: colors.primary[400] },
  cardScore: { fontSize: 18, fontWeight: '700', color: colors.primary[700] },
});
