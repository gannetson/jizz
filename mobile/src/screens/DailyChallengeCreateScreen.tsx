import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loadCountries, type Country } from '../api/countries';
import { createDailyChallenge, startDailyChallenge } from '../api/dailyChallenge';
import { colors } from '../theme';

const MEDIA_OPTIONS = [
  { value: 'images', label: 'Images' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
];

export function DailyChallengeCreateScreen() {
  const navigation = useNavigation();
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country | null>(null);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [media, setMedia] = useState('images');
  const [length, setLength] = useState(10);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCountries().then((list) => {
      const filtered = list.filter((c) => !c.code.includes('NL-NH'));
      setCountries(filtered);
      if (filtered.length > 0 && !country) {
        const nl = filtered.find((c) => c.code === 'NL') || filtered[0];
        setCountry(nl);
      }
    });
  }, []);

  const handleCreateAndStart = async () => {
    if (!country) {
      setError('Select a country');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const challenge = await createDailyChallenge({
        country: country.code,
        media,
        length,
        duration_days: 7,
      });
      await startDailyChallenge(challenge.id);
      (navigation as any).navigate('DailyChallengeDetail', { challengeId: challenge.id });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create challenge');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>New daily challenge</Text>
      <Text style={styles.hint}>Play solo or invite friends after creating. You can start now and add friends later.</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Country</Text>
      <TouchableOpacity style={styles.selectButton} onPress={() => setCountryModalVisible(true)}>
        <Text style={styles.selectButtonText}>{country?.name ?? 'Select country'}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Media type</Text>
      <View style={styles.mediaRow}>
        {MEDIA_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.mediaChip, media === opt.value && styles.mediaChipSelected]}
            onPress={() => setMedia(opt.value)}
          >
            <Text style={[styles.mediaChipText, media === opt.value && styles.mediaChipTextSelected]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Number of questions (default 10)</Text>
      <TextInput
        style={styles.input}
        value={String(length)}
        onChangeText={(t) => setLength(Math.max(1, parseInt(t, 10) || 10))}
        keyboardType="number-pad"
        placeholder="10"
        placeholderTextColor={colors.primary[500]}
      />

      <TouchableOpacity
        style={[styles.primaryButton, creating && styles.buttonDisabled]}
        onPress={handleCreateAndStart}
        disabled={creating || !country}
      >
        {creating ? (
          <ActivityIndicator color={colors.primary[50]} />
        ) : (
          <Text style={styles.primaryButtonText}>Create and start (solo)</Text>
        )}
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
                  onPress={() => {
                    setCountry(item);
                    setCountryModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, country?.code === item.code && styles.modalItemTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setCountryModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 8 },
  hint: { fontSize: 14, color: colors.primary[600], marginBottom: 24 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  label: { fontSize: 16, fontWeight: '600', color: colors.primary[800], marginTop: 16, marginBottom: 8 },
  selectButton: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: { fontSize: 16, color: colors.primary[800] },
  mediaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  mediaChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
  mediaChipSelected: { backgroundColor: colors.primary[500], borderColor: colors.primary[500] },
  mediaChipText: { fontSize: 15, color: colors.primary[800] },
  mediaChipTextSelected: { color: colors.primary[50] },
  input: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.primary[800],
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.primary[50], fontSize: 18, fontWeight: '600' },
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
