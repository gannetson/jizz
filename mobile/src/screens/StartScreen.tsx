import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../api/profile';
import { loadCountries } from '../api/countries';
import { loadLanguages } from '../api/languages';
import type { Country } from '../api/countries';
import type { Language } from '../api/languages';
import { colors } from '../theme';

const LEVELS = [
  { value: 'beginner', label: 'Beginner', sub: 'Very easy multiple choice' },
  { value: 'advanced', label: 'Advanced', sub: 'Multiple choice with similar species' },
  { value: 'expert', label: 'Expert', sub: 'Text input (with auto complete)' },
];

const LENGTHS = ['10', '20', '50', '100'];

const MEDIA = [
  { value: 'images', label: 'Pictures' },
  { value: 'audio', label: 'Sounds' },
  { value: 'video', label: 'Videos' },
];

export function StartScreen() {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const {
    playerName,
    setPlayerName,
    country,
    setCountry,
    language,
    setLanguage,
    level,
    setLevel,
    length,
    setLength,
    mediaType,
    setMediaType,
    soundsScope,
    setSoundsScope,
    includeRare,
    setIncludeRare,
    player,
    loading,
    createGame,
    loadStoredPlayer,
  } = useGame();

  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [countriesLoaded, setCountriesLoaded] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  useEffect(() => {
    loadCountries().then((list) => {
      const filtered = list.filter((c) => !c.code.includes('NL-NH'));
      setCountries(filtered);
      setCountriesLoaded(true);
      if (filtered.length > 0) {
        const nl = filtered.find((c) => c.code === 'NL') || filtered[0];
        setCountry(nl);
      }
    });
    loadLanguages().then(setLanguages);
    loadStoredPlayer();
  }, []);

  // When logged in, prefill player name, country and species language from profile
  useEffect(() => {
    if (!isAuthenticated || !countriesLoaded || countries.length === 0) return;
    let cancelled = false;
    getProfile()
      .then((profile) => {
        if (cancelled) return;
        if (profile.username?.trim()) {
          setPlayerName(profile.username.trim());
        }
        if (profile.country_code) {
          const c = countries.find((x) => x.code === profile.country_code);
          if (c) setCountry(c);
        }
        if (profile.language?.trim()) {
          setLanguage(profile.language.trim());
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, countriesLoaded, countries.length]);

  const handleStart = async () => {
    if (!playerName.trim()) {
      Alert.alert('Missing name', "What's your name? You can pick any name you want.");
      return;
    }
    if (!country) {
      Alert.alert('Select country', 'Please select a country.');
      return;
    }
    try {
      const game = await createGame();
      if (game) {
        (navigation as any).navigate('Lobby');
      } else {
        Alert.alert('Error', 'Could not create game. Please try again.');
      }
    } catch (e: any) {
      const message = e?.name === 'AbortError'
        ? 'Request timed out. Check your connection and try again.'
        : (e?.message || 'Could not create game. Please try again.');
      Alert.alert('Error', message);
    }
  };

  if (!countriesLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Start a new game</Text>
      <Text style={styles.hint}>
        To get a high score, identify the birds correctly and be fast! After each answer you see how many points you got.
      </Text>

      <Text style={styles.label}>Player name</Text>
      <TextInput
        style={styles.input}
        value={playerName || player?.name || ''}
        onChangeText={setPlayerName}
        placeholder="Your name"
        placeholderTextColor={colors.primary[500]}
      />

      <Text style={styles.label}>Country</Text>
      <TouchableOpacity style={styles.selectButton} onPress={() => setCountryModalVisible(true)}>
        <Text style={styles.selectButtonText}>{country?.name ?? 'Select country...'}</Text>
      </TouchableOpacity>
      <Modal visible={countryModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setCountryModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Select country</Text>
            <FlatList
              data={countries}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, country?.code === item.code && styles.modalItemSelected]}
                  onPress={() => { setCountry(item); setCountryModalVisible(false); }}
                >
                  <Text style={[styles.modalItemText, country?.code === item.code && styles.modalItemTextSelected]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setCountryModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Text style={styles.label}>Language (species names)</Text>
      <TouchableOpacity style={styles.selectButton} onPress={() => setLanguageModalVisible(true)}>
        <Text style={styles.selectButtonText}>{languages.find((l) => l.code === language)?.name ?? 'Select language...'}</Text>
      </TouchableOpacity>
      <Modal visible={languageModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setLanguageModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Select language</Text>
            <FlatList
              data={languages}
              keyExtractor={(l) => l.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, language === item.code && styles.modalItemSelected]}
                  onPress={() => { setLanguage(item.code); setLanguageModalVisible(false); }}
                >
                  <Text style={[styles.modalItemText, language === item.code && styles.modalItemTextSelected]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setLanguageModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Text style={styles.label}>Include rare species</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.chip, includeRare && styles.chipSelected]}
          onPress={() => setIncludeRare(true)}
        >
          <Text style={[styles.chipText, includeRare && styles.chipTextSelected]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, !includeRare && styles.chipSelected]}
          onPress={() => setIncludeRare(false)}
        >
          <Text style={[styles.chipText, !includeRare && styles.chipTextSelected]}>No</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Questions</Text>
      <View style={styles.pickerRow}>
        {LENGTHS.map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.chip, length === l && styles.chipSelected]}
            onPress={() => setLength(l)}
          >
            <Text style={[styles.chipText, length === l && styles.chipTextSelected]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Level</Text>
      {LEVELS.map((l) => (
        <TouchableOpacity
          key={l.value}
          style={[styles.levelRow, level === l.value && styles.levelRowSelected]}
          onPress={() => setLevel(l.value)}
        >
          <Text style={[styles.levelLabel, level === l.value && styles.levelLabelSelected]}>{l.label}</Text>
          <Text style={[styles.levelSub, level === l.value && styles.levelSubSelected]}>{l.sub}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Media type</Text>
      <View style={styles.mediaRow}>
        {MEDIA.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.chip, mediaType === m.value && styles.chipSelected]}
            onPress={() => {
              setMediaType(m.value);
              if (m.value !== 'audio') setSoundsScope('all');
            }}
          >
            <Text style={[styles.chipText, mediaType === m.value && styles.chipTextSelected]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mediaType === 'audio' && (
        <>
          <Text style={styles.label}>Sounds</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={[styles.chip, soundsScope === 'all' && styles.chipSelected]}
              onPress={() => setSoundsScope('all')}
            >
              <Text style={[styles.chipText, soundsScope === 'all' && styles.chipTextSelected]}>All birds</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, soundsScope === 'passerines' && styles.chipSelected]}
              onPress={() => setSoundsScope('passerines')}
            >
              <Text style={[styles.chipText, soundsScope === 'passerines' && styles.chipTextSelected]}>Passerines</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.startButton, (!country || !playerName.trim()) && styles.startButtonDisabled]}
        onPress={handleStart}
        disabled={loading || !country || !playerName.trim()}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary[50]} />
        ) : (
          <Text style={styles.startButtonText}>Start a new game</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 8 },
  hint: { fontSize: 14, color: colors.primary[600], marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: colors.primary[800], marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.primary[800],
  },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[300],
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  chipText: { fontSize: 14, color: colors.primary[800] },
  chipTextSelected: { color: colors.primary[50] },
  levelRow: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginBottom: 8,
  },
  levelRowSelected: { borderColor: colors.primary[500], backgroundColor: colors.primary[500] },
  levelLabel: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  levelLabelSelected: { color: colors.primary[50] },
  levelSub: { fontSize: 12, color: colors.primary[600], marginTop: 2 },
  levelSubSelected: { color: colors.primary[200] },
  startButton: {
    marginTop: 32,
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonDisabled: { opacity: 0.6 },
  startButtonText: { color: colors.primary[50], fontSize: 18, fontWeight: '600' },
  selectButton: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: { fontSize: 16, color: colors.primary[800] },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '70%', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.primary[800], marginBottom: 12 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 8 },
  modalItemSelected: { backgroundColor: colors.primary[100] },
  modalItemText: { fontSize: 16, color: colors.primary[800] },
  modalItemTextSelected: { fontWeight: '600', color: colors.primary[700] },
  modalClose: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: colors.primary[500], fontWeight: '600' },
});
