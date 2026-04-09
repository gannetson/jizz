import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslation } from '../i18n/TranslationContext';
import { setSpeciesLanguageIndependent } from '../i18n/speciesLanguagePreference';
import { getProfile, updateProfile, updateProfileAvatar, getAvatarUrl, deleteAccount, type UserProfile } from '../api/profile';
import { loadCountries, type Country } from '../api/countries';
import { loadLanguages, type Language } from '../api/languages';
import { getCountryDisplayName } from '../i18n/countryNames';
import { getLanguageDisplayName } from '../i18n/languageNames';
import { colors } from '../theme';

export function ProfileScreen() {
  const { t, locale, setLocale } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { refreshProfile } = useProfile();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [language, setLanguage] = useState('');
  const [timezone, setTimezone] = useState('Europe/Amsterdam');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [languageSearch, setLanguageSearch] = useState('');
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  /** True after user changes species language in the modal; blocks loadProfile from overwriting before save. */
  const speciesLanguageDirtyRef = useRef(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const p = await getProfile();
      setProfile(p);
      setUsername(p.username);
      if (!speciesLanguageDirtyRef.current) {
        setLanguage(p.language || 'en');
      }
      setTimezone(p.timezone || 'Europe/Amsterdam');
      setCountryCode(p.country_code ?? null);
      if (p.avatar_url) setAvatarPreviewUri(null);
    } catch (e: any) {
      setError(e?.message ?? t('failed_load_profile'));
      if (e?.message === 'Unauthorized' || e?.message?.includes('401')) {
        (navigation as any).replace('Login');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, navigation, t]);

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      if (!isAuthenticated) {
        const state = navigation.getState();
        const currentRoute = state?.routes[state.index]?.name;
        if (currentRoute !== 'Login' && currentRoute !== 'Register') {
          (navigation as any).replace('Login');
        }
        return;
      }
      loadProfile();
    }, [authLoading, isAuthenticated, navigation, loadProfile])
  );

  useEffect(() => {
    loadLanguages().then(setLanguages);
    loadCountries().then((list) => setCountries(list.filter((c) => !c.code.includes('NL-NH'))));
  }, []);

  useEffect(() => {
    if (!saveToast) return;
    const id = setTimeout(() => setSaveToast(null), 2200);
    return () => clearTimeout(id);
  }, [saveToast]);

  const showAvatarOptions = useCallback(() => {
    Alert.alert(
      t('change_avatar'),
      undefined,
      [
        { text: t('camera'), onPress: () => pickImage('camera') },
        { text: t('photo_library'), onPress: () => pickImage('library') },
        { text: t('cancel'), style: 'cancel' },
      ]
    );
  }, [t]);

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permission_required'), t('camera_permission'));
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('permission_required'), t('library_permission'));
        return;
      }
    }
    setUploadingAvatar(true);
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
      const fileName = uri.split('/').pop() || 'avatar.jpg';
      setAvatarPreviewUri(uri);
      const updated = await updateProfileAvatar(uri, fileName);
      setProfile(updated);
      refreshProfile();
    } catch (e: any) {
      setError(e?.message ?? t('failed_to_update_photo'));
    } finally {
      setUploadingAvatar(false);
    }
  }, [t]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      t('delete_account_confirm_title'),
      t('delete_account_confirm_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete_account_button'),
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAccount(true);
              setError(null);
              await deleteAccount();
              // Always logout and go to Start so the app is in a logged-out state.
              try {
                await logout();
              } finally {
                (navigation as any).replace('Start');
              }
            } catch (e: any) {
              setError(e?.message ?? t('failed_delete_account'));
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ]
    );
  }, [t, logout, navigation]);

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setError(null);
      await updateProfile({
        username: username.trim() || undefined,
        language: language || undefined,
        timezone: timezone?.trim() || undefined,
        country_code: countryCode ?? undefined,
      });
      const speciesCode = (language || 'en').trim();
      const updated = await getProfile();
      setProfile(updated);
      setUsername(updated.username);
      setLanguage(updated.language || 'en');
      setTimezone(updated.timezone ?? 'Europe/Amsterdam');
      setCountryCode(updated.country_code ?? null);
      speciesLanguageDirtyRef.current = false;
      refreshProfile();
      setSaveToast(t('profile_saved'));
      setTimeout(() => {
        (navigation as any).navigate('Home');
      }, 450);
    } catch (e: any) {
      setError(e?.message ?? t('failed_update_profile'));
    } finally {
      setSaving(false);
    }
  };

  // All hooks must run on every render (before any early return).
  const countryOptions = React.useMemo(() => {
    const withDisplay = countries.map((c) => ({ ...c, displayName: getCountryDisplayName(c, locale) }));
    withDisplay.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));
    return [{ code: '', name: t('none'), displayName: t('none') }, ...withDisplay];
  }, [countries, locale, t]);
  const filteredCountryOptions = React.useMemo(() => {
    if (!countrySearch.trim()) return countryOptions;
    const q = countrySearch.trim().toLowerCase();
    return countryOptions.filter((o) => (o.displayName ?? o.name).toLowerCase().includes(q));
  }, [countryOptions, countrySearch]);

  const sortedLanguages = React.useMemo(
    () => [...languages].sort((a, b) => getLanguageDisplayName(a, locale).localeCompare(getLanguageDisplayName(b, locale), undefined, { sensitivity: 'base' })),
    [languages, locale]
  );
  const filteredLanguages = React.useMemo(() => {
    if (!languageSearch.trim()) return sortedLanguages;
    const q = languageSearch.trim().toLowerCase();
    return sortedLanguages.filter((l) => getLanguageDisplayName(l, locale).toLowerCase().includes(q));
  }, [sortedLanguages, languageSearch, locale]);

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>{t('redirecting_login')}</Text>
      </View>
    );
  }

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>{t('loading_profile')}</Text>
      </View>
    );
  }

  const selectedLanguage = languages.find((l) => l.code === language);
  const languageLabel = selectedLanguage ? getLanguageDisplayName(selectedLanguage, locale) : language;
  const selectedCountry = countryCode ? countries.find((c) => c.code === countryCode) : null;
  const countryLabel = selectedCountry ? getCountryDisplayName(selectedCountry, locale) : t('none');
  const displayName = username || profile?.email || '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <View style={styles.screenRoot}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarRing}
          onPress={uploadingAvatar ? undefined : showAvatarOptions}
          activeOpacity={0.8}
          disabled={uploadingAvatar}
        >
          {avatarPreviewUri ? (
            <Image source={{ uri: avatarPreviewUri }} style={styles.avatarImage} resizeMode="cover" />
          ) : getAvatarUrl(profile) ? (
            <Image
              source={{ uri: getAvatarUrl(profile) ?? '' }}
              style={styles.avatarImage}
              resizeMode="cover"
              accessibilityLabel={t('username')}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          {uploadingAvatar && (
            <View style={[StyleSheet.absoluteFillObject, styles.avatarOverlay]}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={uploadingAvatar ? undefined : showAvatarOptions} disabled={uploadingAvatar}>
          <Text style={styles.changePhotoLabel}>{t('change_avatar')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>{t('username')}</Text>
      <TextInput
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        placeholder={t('username')}
        placeholderTextColor={colors.primary[500]}
        autoCapitalize="none"
      />
      <Text style={styles.label}>{t('email')}</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled]}
        value={profile?.email ?? ''}
        editable={false}
        placeholderTextColor={colors.primary[500]}
      />
      <Text style={styles.label}>{t('species_language_names')}</Text>
      <TouchableOpacity style={styles.selectButton} onPress={() => setLanguageModalVisible(true)}>
        <Text style={styles.selectButtonText}>{languageLabel}</Text>
      </TouchableOpacity>
      <Text style={styles.label}>{t('country_optional')}</Text>
      <TouchableOpacity style={styles.selectButton} onPress={() => setCountryModalVisible(true)}>
        <Text style={styles.selectButtonText}>{countryLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.primary[50]} />
        ) : (
          <Text style={styles.saveButtonText}>{t('save')}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.deleteSection}>
        <TouchableOpacity
          style={[styles.deleteAccountButton, deletingAccount && styles.deleteAccountButtonDisabled]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
        >
          {deletingAccount ? (
            <ActivityIndicator color={colors.error[500]} size="small" />
          ) : (
            <Text style={styles.deleteAccountButtonText}>{t('delete_account')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={languageModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => { setLanguageModalVisible(false); setLanguageSearch(''); }}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('select_language')}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('search')}
              placeholderTextColor={colors.primary[400]}
              value={languageSearch}
              onChangeText={setLanguageSearch}
            />
            <FlatList
              data={filteredLanguages}
              keyExtractor={(l) => l.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, language === item.code && styles.modalItemSelected]}
                  onPress={() => {
                    void (async () => {
                      speciesLanguageDirtyRef.current = true;
                      await setSpeciesLanguageIndependent(true);
                      setLanguage(item.code);
                      setLanguageModalVisible(false);
                      setLanguageSearch('');
                    })();
                  }}
                >
                  <Text style={[styles.modalItemText, language === item.code && styles.modalItemTextSelected]}>{getLanguageDisplayName(item, locale)}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => { setLanguageModalVisible(false); setLanguageSearch(''); }}>
              <Text style={styles.modalCloseText}>{t('close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={countryModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => { setCountryModalVisible(false); setCountrySearch(''); }}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('select_country')}</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('search')}
              placeholderTextColor={colors.primary[400]}
              value={countrySearch}
              onChangeText={setCountrySearch}
            />
            <FlatList
              data={filteredCountryOptions}
              keyExtractor={(c) => c.code || '_none'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, (item.code ? countryCode === item.code : !countryCode) && styles.modalItemSelected]}
                  onPress={() => {
                    setCountryCode(item.code || null);
                    setCountryModalVisible(false);
                    setCountrySearch('');
                  }}
                >
                  <Text style={[styles.modalItemText, (item.code ? countryCode === item.code : !countryCode) && styles.modalItemTextSelected]}>{(item as { displayName?: string }).displayName ?? item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => { setCountryModalVisible(false); setCountrySearch(''); }}>
              <Text style={styles.modalCloseText}>{t('close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
    {saveToast != null ? (
      <View
        style={[styles.saveToast, { bottom: Math.max(insets.bottom, 12) + 8 }]}
        pointerEvents="none"
        accessibilityLiveRegion="polite"
        accessibilityRole="text"
      >
        <Text style={styles.saveToastText}>{saveToast}</Text>
      </View>
    ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  saveToast: {
    position: 'absolute',
    left: 24,
    right: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.primary[800],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  saveToastText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[50],
    textAlign: 'center',
  },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 14, color: colors.primary[600], marginTop: 8 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[100],
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoLabel: {
    marginTop: 8,
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '500',
  },
  avatarImage: {
    width: 96,
    height: 96,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary[50],
  },
  label: { fontSize: 16, fontWeight: '600', color: colors.primary[800], marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.primary[800],
  },
  inputDisabled: { backgroundColor: colors.primary[50], color: colors.primary[600] },
  selectButton: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: { fontSize: 16, color: colors.primary[800] },
  radioRow: {
    flexDirection: 'row',
    gap: 12,
  },
  radioChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary[300],
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  radioChipSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  radioChipText: {
    fontSize: 14,
    color: colors.primary[800],
    fontWeight: '500',
  },
  radioChipTextSelected: {
    color: '#fff',
  },
  saveButton: {
    marginTop: 32,
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: colors.primary[50], fontSize: 18, fontWeight: '600' },
  deleteSection: { marginTop: 32, alignItems: 'center' },
  deleteAccountButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  deleteAccountButtonDisabled: { opacity: 0.7 },
  deleteAccountButtonText: { fontSize: 16, color: colors.error[500], fontWeight: '500' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, maxHeight: '70%', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.primary[800], marginBottom: 12 },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: colors.primary[800],
    marginBottom: 8,
  },
  modalItem: { paddingVertical: 14, paddingHorizontal: 8 },
  modalItemSelected: { backgroundColor: colors.primary[100] },
  modalItemText: { fontSize: 16, color: colors.primary[800] },
  modalItemTextSelected: { fontWeight: '600', color: colors.primary[700] },
  modalClose: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: colors.primary[500], fontWeight: '600' },
});
