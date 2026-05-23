import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { loadCountries, type Country } from '../api/countries';
import {
  startBirdrJourney,
  getStoredBirdrJourneyPlayerToken,
  createBirdrJourneyPlayer,
} from '../api/birdrJourney';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from '../i18n/TranslationContext';
import { getCountryDisplayName } from '../i18n/countryNames';
import { colors } from '../theme';

type RouteParams = {
  BirdrJourneyCountry: { resumeCountryCode?: string } | undefined;
};

export function BirdrJourneyCountryScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'BirdrJourneyCountry'>>();
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { profile, ready: profileReady } = useProfile();
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCountries()
      .then((list) => {
        const filtered = list.filter((c) => !c.code.includes('NL-NH'));
        setCountries(filtered);
        const resume = route.params?.resumeCountryCode;
        if (resume) {
          const match = filtered.find((c) => c.code === resume);
          if (match) setCountry(match);
        } else if (profileReady && profile?.country_code) {
          const match = filtered.find((c) => c.code === profile.country_code);
          if (match) setCountry(match);
        } else if (!country && filtered.length > 0) {
          setCountry(filtered.find((c) => c.code === 'NL') ?? filtered[0]);
        }
      })
      .finally(() => setLoadingCountries(false));
  }, [profileReady, profile?.country_code, route.params?.resumeCountryCode]);

  const sortedCountries = useMemo(
    () =>
      [...countries].sort((a, b) =>
        getCountryDisplayName(a, locale).localeCompare(
          getCountryDisplayName(b, locale),
          undefined,
          { sensitivity: 'base' }
        )
      ),
    [countries, locale]
  );

  const filteredCountries = useMemo(() => {
    if (!search.trim()) return sortedCountries;
    const q = search.trim().toLowerCase();
    return sortedCountries.filter((c) =>
      getCountryDisplayName(c, locale).toLowerCase().includes(q)
    );
  }, [sortedCountries, search, locale]);

  const ensureAuth = async (): Promise<boolean> => {
    if (isAuthenticated) return true;
    const token = await getStoredBirdrJourneyPlayerToken();
    if (token) return true;
    try {
      await createBirdrJourneyPlayer('Guest', locale === 'nl' ? 'nl' : 'en');
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('failed_load');
      Alert.alert(t('birdr_journey'), msg);
      return false;
    }
  };

  const handleConfirm = async () => {
    if (!country) {
      Alert.alert(t('birdr_journey'), t('please_select_country'));
      return;
    }
    const ok = await ensureAuth();
    if (!ok) return;
    setSubmitting(true);
    try {
      await startBirdrJourney(country.code);
      (navigation as any).navigate('BirdrJourneyProgress', { countryCode: country.code });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('failed_load');
      Alert.alert(t('birdr_journey'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCountries) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('birdr_journey_select_country')}</Text>
      <Text style={styles.subtitle}>{t('birdr_journey_country_hint')}</Text>

      <Text style={styles.label}>{t('country')}</Text>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setModalVisible(true)}
        accessibilityLabel={t('select_country_dots')}
      >
        <Text style={styles.selectButtonText}>
          {country ? getCountryDisplayName(country, locale) : t('select_country_dots')}
        </Text>
      </TouchableOpacity>

      {!isAuthenticated && (
        <Text style={styles.guestHint}>{t('birdr_journey_guest_save_hint')}</Text>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, submitting && styles.buttonDisabled]}
        onPress={handleConfirm}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primary[50]} />
        ) : (
          <Text style={styles.primaryButtonText}>{t('birdr_journey_begin')}</Text>
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('select_country_dots')}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('search')}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setCountry(item);
                    setModalVisible(false);
                    setSearch('');
                  }}
                >
                  <Text style={styles.modalRowText}>{getCountryDisplayName(item, locale)}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>{t('close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.primary[600],
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[700],
    marginBottom: 8,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  selectButtonText: { fontSize: 16, color: colors.primary[800] },
  guestHint: {
    fontSize: 14,
    color: colors.primary[600],
    marginBottom: 20,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    color: colors.primary[50],
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary[800],
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 16,
  },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.primary[100] },
  modalRowText: { fontSize: 16, color: colors.primary[800] },
  modalClose: { paddingVertical: 16, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: colors.primary[500], fontWeight: '600' },
});
