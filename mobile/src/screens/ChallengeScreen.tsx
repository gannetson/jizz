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
  createChallengePlayer,
  getStoredChallengePlayerToken,
  setStoredChallengePlayerToken,
  clearStoredChallengePlayerToken,
  type CountryChallenge,
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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        setError(null);
        const token = await getStoredChallengePlayerToken();
        if (token) {
          try {
            const c = await loadCountryChallenge(token);
            if (cancelled) return;
            if (c === null) {
              await clearStoredChallengePlayerToken();
              setChallenge(null);
              setPlayerToken(null);
            } else {
              setChallenge(c);
              setPlayerToken(token);
            }
          } catch (e: any) {
            if (cancelled) return;
            await clearStoredChallengePlayerToken();
            setChallenge(null);
            setPlayerToken(null);
            setError(e?.message ?? 'Failed to load challenge');
          }
        } else {
          if (!cancelled) {
            setChallenge(null);
            setPlayerToken(null);
          }
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

  // When we have a loaded challenge (e.g. returning to screen), default name to current challenge player
  useEffect(() => {
    if (challenge?.player?.name && !name) {
      setName(challenge.player.name);
    }
  }, [challenge?.player?.name]);

  const effectiveName = name || challenge?.player?.name || '';

  const handleStartChallenge = async () => {
    if (!effectiveName.trim() || !country) {
      setError('Please enter your name and select a country.');
      return;
    }
    setCreating(true);
    setError(null);
    setChallenge(null);
    try {
      await clearStoredChallengePlayerToken();
      const player = await createChallengePlayer(effectiveName.trim(), language);
      await setStoredChallengePlayerToken(player.token);
      setPlayerToken(player.token);
      const c = await startCountryChallenge(country.code, player.token);
      setChallenge(c);
      const gameToken = c?.levels?.[0]?.game?.token;
      (navigation as any).navigate('ChallengeLevelIntro', {
        challengeId: c?.id,
        gameToken: gameToken ?? undefined,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start challenge');
    } finally {
      setCreating(false);
    }
  };

  const handleContinueToChallenge = () => {
    const gameToken = challenge?.levels?.[0]?.game?.token;
    (navigation as any).navigate('ChallengeLevelIntro', {
      challengeId: challenge?.id,
      gameToken: gameToken ?? undefined,
    });
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* First step: create form (name, country, language) – always shown */}
      <View style={styles.createSection}>
        <Text style={styles.title} testID="countryChallenge.title" accessibilityLabel="Country challenge">Country challenge</Text>
        <Text style={styles.hint}>
          You will run through different levels. Some easy and some quite difficult.
        </Text>
        <Text style={styles.label}>Your name</Text>
        <TextInput
          style={styles.input}
          value={effectiveName}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.primary[500]}
          testID="countryChallenge.nameInput"
          accessibilityLabel="Your name"
        />
        <Text style={styles.label}>Language (species names)</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setLanguageModalVisible(true)} testID="countryChallenge.selectLanguage" accessibilityLabel="Select language">
          <Text style={styles.selectButtonText}>
            {languages.find((l) => l.code === language)?.name ?? 'Select language'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.label}>Country</Text>
        <TouchableOpacity style={styles.selectButton} onPress={() => setCountryModalVisible(true)} testID="countryChallenge.selectCountry" accessibilityLabel="Select country">
          <Text style={styles.selectButtonText}>{country?.name ?? 'Select country'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, creating && styles.buttonDisabled]}
          onPress={handleStartChallenge}
          disabled={creating || !effectiveName.trim() || !country}
          testID="countryChallenge.startChallenge"
          accessibilityLabel="Start challenge"
        >
          {creating ? (
            <ActivityIndicator color={colors.primary[50]} />
          ) : (
            <Text style={styles.primaryButtonText}>Start challenge</Text>
          )}
        </TouchableOpacity>
      </View>
      {challenge?.country?.name && level?.challenge_level?.title ? (
        <View style={[styles.levelSection, styles.levelSectionDivider]}>
          <Text>
            {challenge.country.name} – {level.challenge_level.title}
          </Text>
          {(() => {
            const answersCount = level?.game?.scores?.[0]?.answers?.length ?? 0;
            const total = typeof level?.game?.length === 'number' ? level.game.length : Number(level?.game?.length) || 0;
            if (answersCount > 0 && total > 0) {
              const currentQuestion = answersCount + 1;
              if (currentQuestion <= total) {
                return (
                  <Text style={styles.inProgressSummary}>Question {currentQuestion} of {total}</Text>
                );
              }
            }
            return null;
          })()}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleContinueToChallenge}
            testID="countryChallenge.continueToChallenge"
            accessibilityLabel="Continue to your challenge"
          >
            <Text style={styles.secondaryButtonText}>Continue to your challenge</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={countryModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setCountryModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle} testID="countryChallenge.modal.countryTitle">Select country</Text>
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
                  testID={`countryChallenge.modal.country.${item.code}`}
                  accessibilityLabel={item.name}
                >
                  <Text style={[styles.modalItemText, country?.code === item.code && styles.modalItemTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setCountryModalVisible(false)} testID="countryChallenge.modal.countryClose" accessibilityLabel="Close country modal">
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={languageModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setLanguageModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle} testID="countryChallenge.modal.languageTitle">Select language</Text>
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
                  testID={`countryChallenge.modal.language.${item.code}`}
                  accessibilityLabel={item.name}
                >
                  <Text style={[styles.modalItemText, language === item.code && styles.modalItemTextSelected]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setLanguageModalVisible(false)} testID="countryChallenge.modal.languageClose" accessibilityLabel="Close language modal">
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
  levelSectionDivider: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: colors.primary[200] },
  inProgressSummary: { fontSize: 15, color: colors.primary[700], marginTop: 4, marginBottom: 4 },
  levelSectionTitle: { fontSize: 18, fontWeight: '600', color: colors.primary[700], marginBottom: 12 },
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
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary[100],
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
  secondaryButtonText: { color: colors.primary[700], fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.4, backgroundColor: colors.primary[300] },
  primaryButtonText: { color: colors.primary[50], fontSize: 18, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '70%', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.primary[800], marginBottom: 12 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 8 },
  modalItemSelected: { backgroundColor: colors.primary[100] },
  modalItemText: { fontSize: 16, color: colors.primary[800] },
  modalItemTextSelected: { fontWeight: '600', color: colors.primary[700] },
  modalClose: { marginTop: 12, paddingVertical: 14, paddingHorizontal: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 16, color: colors.primary[500], fontWeight: '600' },
});
