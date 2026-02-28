import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { loadCountries, type Country } from '../api/countries';
import { loadLanguages, type Language } from '../api/languages';
import {
  loadCountryChallenge,
  startCountryChallenge,
  getNextChallengeLevel,
  createChallengePlayer,
  getStoredChallengePlayerToken,
  setStoredChallengePlayerToken,
  type CountryChallenge,
  type CountryGameLevel,
} from '../api/challenge';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../api/profile';
import { colors } from '../theme';

export function ChallengeScreen() {
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<CountryChallenge | null>(null);
  const [playerToken, setPlayerToken] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [language, setLanguage] = useState('en');
  const [country, setCountry] = useState<Country | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [nextLevelLoading, setNextLevelLoading] = useState(false);

  const loadChallenge = useCallback(async (token: string) => {
    try {
      const c = await loadCountryChallenge(token);
      setChallenge(c);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load challenge');
      setChallenge(null);
    }
  }, []);

  const refreshChallenge = useCallback(async () => {
    const token = await getStoredChallengePlayerToken();
    if (token) {
      setPlayerToken(token);
      await loadChallenge(token);
    } else {
      setChallenge(null);
      setPlayerToken(null);
    }
  }, [loadChallenge]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        const token = await getStoredChallengePlayerToken();
        if (token) {
          setPlayerToken(token);
          try {
            const c = await loadCountryChallenge(token);
            if (!cancelled) setChallenge(c);
          } catch (e: any) {
            if (!cancelled) setError(e?.message ?? 'Failed to load challenge');
          }
        } else {
          if (!cancelled) setChallenge(null);
          setPlayerToken(null);
        }
        if (!cancelled) setLoading(false);
      })();
      return () => { cancelled = true; };
    }, [])
  );

  useEffect(() => {
    loadCountries().then((list) => {
      const filtered = list.filter((c) => !c.code.includes('NL-NH'));
      setCountries(filtered);
      if (filtered.length > 0 && !country) {
        const nl = filtered.find((c) => c.code === 'NL') || filtered[0];
        setCountry(nl);
      }
    });
    loadLanguages().then(setLanguages);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || countries.length === 0) return;
    let cancelled = false;
    getProfile()
      .then((profile) => {
        if (cancelled) return;
        if (profile.username?.trim()) setName(profile.username.trim());
        if (profile.country_code) {
          const c = countries.find((x) => x.code === profile.country_code);
          if (c) setCountry(c);
        }
        if (profile.language) setLanguage(profile.language);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, countries.length]);

  const handleStartChallenge = async () => {
    if (!name.trim() || !country) {
      setError('Please enter your name and select a country.');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const player = await createChallengePlayer(name.trim(), language);
      await setStoredChallengePlayerToken(player.token);
      setPlayerToken(player.token);
      const c = await startCountryChallenge(country.code, player.token);
      setChallenge(c);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start challenge');
    } finally {
      setCreating(false);
    }
  };

  const handleStartLevel = () => {
    const gameToken = challenge?.levels?.[0]?.game?.token;
    const gameLevel = challenge?.levels?.[0]?.game?.level;
    const gameMedia = challenge?.levels?.[0]?.game?.media;
    if (gameToken && challenge?.id && playerToken) {
      (navigation as any).navigate('ChallengePlay', {
        gameToken,
        challengeId: challenge.id,
        countryCode: challenge.country?.code,
        language: challenge.levels?.[0]?.game?.language ?? language,
        gameLevel: gameLevel ?? 'advanced',
        gameMedia: gameMedia ?? 'images',
      });
    }
  };

  const handleRestartOrNextLevel = async () => {
    if (!challenge?.id || !playerToken) return;
    setNextLevelLoading(true);
    setError(null);
    try {
      await getNextChallengeLevel(challenge.id, playerToken);
      await refreshChallenge();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to continue');
    } finally {
      setNextLevelLoading(false);
    }
  };

  if (loading && !challenge) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>Loading challenge…</Text>
      </View>
    );
  }

  const level = challenge?.levels?.[0];
  const status = level?.status;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!challenge || !level ? (
        <View style={styles.createSection}>
          <Text style={styles.title}>Country challenge</Text>
          <Text style={styles.hint}>
            You will run through different levels. Some easy and some quite difficult.
          </Text>
          <Text style={styles.label}>Your name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.primary[500]}
          />
          <Text style={styles.label}>Language (species names)</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setLanguageModalVisible(true)}>
            <Text style={styles.selectButtonText}>
              {languages.find((l) => l.code === language)?.name ?? 'Select language'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.label}>Country</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setCountryModalVisible(true)}>
            <Text style={styles.selectButtonText}>{country?.name ?? 'Select country'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, creating && styles.buttonDisabled]}
            onPress={handleStartChallenge}
            disabled={creating || !name.trim() || !country}
          >
            {creating ? (
              <ActivityIndicator color={colors.primary[50]} />
            ) : (
              <Text style={styles.primaryButtonText}>Start challenge</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : status === 'new' ? (
        <View style={styles.levelSection}>
          <Text style={styles.title}>
            Round {level.challenge_level.sequence + 1} – {level.challenge_level.title}
          </Text>
          <Text style={styles.subtitle}>What is this level about?</Text>
          <Text style={styles.description}>
            {level.challenge_level.description}
          </Text>
          <Text style={styles.jokersLabel}>
            Jokers this round: {' '}
            {Array.from({ length: level.challenge_level.jokers }).map((_, i) => '♥').join(' ')}
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartLevel}>
            <Text style={styles.primaryButtonText}>Start Level</Text>
          </TouchableOpacity>
        </View>
      ) : status === 'failed' ? (
        <View style={styles.levelSection}>
          <Text style={[styles.title, styles.failedTitle]}>
            Failed! Round {level.challenge_level.sequence + 1} – {level.challenge_level.title}
          </Text>
          <Text style={styles.description}>
            Ouch! That was one wrong answer too many...
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, nextLevelLoading && styles.buttonDisabled]}
            onPress={handleRestartOrNextLevel}
            disabled={nextLevelLoading}
          >
            {nextLevelLoading ? (
              <ActivityIndicator color={colors.primary[50]} />
            ) : (
              <Text style={styles.primaryButtonText}>Restart Level</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : status === 'passed' ? (
        <View style={styles.levelSection}>
          <Text style={styles.title}>
            Congratulations! Level {level.challenge_level.sequence + 1} completed!
          </Text>
          <Text style={styles.description}>
            Well done! Ready for the next challenge?
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, nextLevelLoading && styles.buttonDisabled]}
            onPress={handleRestartOrNextLevel}
            disabled={nextLevelLoading}
          >
            {nextLevelLoading ? (
              <ActivityIndicator color={colors.primary[50]} />
            ) : (
              <Text style={styles.primaryButtonText}>Next Level</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.levelSection}>
          <Text style={styles.title}>Level in progress</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartLevel}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

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
                  onPress={() => {
                    setLanguage(item.code);
                    setLanguageModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, language === item.code && styles.modalItemTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setLanguageModalVisible(false)}>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: colors.primary[600], marginTop: 8 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  createSection: {},
  levelSection: {},
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 8 },
  failedTitle: { color: colors.error[500] },
  subtitle: { fontSize: 18, fontWeight: '600', color: colors.primary[700], marginTop: 12 },
  description: { fontSize: 15, color: colors.primary[700], marginTop: 8, lineHeight: 22 },
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
  selectButton: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: { fontSize: 16, color: colors.primary[800] },
  jokersLabel: { fontSize: 15, color: colors.primary[700], marginTop: 16 },
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
