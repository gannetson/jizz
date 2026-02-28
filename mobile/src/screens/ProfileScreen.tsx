import React, { useState, useCallback, useEffect } from 'react';
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
import { getProfile, updateProfile, updateProfileAvatar, getAvatarUrl, type UserProfile } from '../api/profile';
import { loadCountries, type Country } from '../api/countries';
import { loadLanguages, type Language } from '../api/languages';
import { colors } from '../theme';

export function ProfileScreen() {
  const { t, locale, setLocale } = useTranslation();
  const navigation = useNavigation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { refreshProfile } = useProfile();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [language, setLanguage] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const p = await getProfile();
      setProfile(p);
      setUsername(p.username);
      setLanguage(p.language || 'en');
      setCountryCode(p.country_code ?? null);
      if (p.avatar_url) setAvatarPreviewUri(null);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load profile');
      if (e?.message === 'Unauthorized' || e?.message?.includes('401')) {
        (navigation as any).replace('Login');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, navigation]);

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

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setError(null);
      await updateProfile({
        username: username.trim() || undefined,
        language: language || undefined,
        country_code: countryCode ?? undefined,
      });
      const updated = await getProfile();
      setProfile(updated);
      setUsername(updated.username);
      setLanguage(updated.language || 'en');
      setCountryCode(updated.country_code ?? null);
      refreshProfile();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>Redirecting to login…</Text>
      </View>
    );
  }

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.muted}>Loading profile…</Text>
      </View>
    );
  }

  const languageLabel = languages.find((l) => l.code === language)?.name ?? language;
  const countryLabel = countryCode ? countries.find((c) => c.code === countryCode)?.name ?? countryCode : 'None';
  const appLanguageLabel = locale === 'nl' ? 'Nederlands' : 'English';
  const displayName = username || profile?.email || '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
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
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={[styles.input, styles.inputDisabled]}
        value={profile?.email ?? ''}
        editable={false}
        placeholderTextColor={colors.primary[500]}
      />
      <Text style={styles.label}>Language (species names)</Text>
      <TouchableOpacity style={styles.selectButton} onPress={() => setLanguageModalVisible(true)}>
        <Text style={styles.selectButtonText}>{languageLabel}</Text>
      </TouchableOpacity>
      <Text style={styles.label}>App language</Text>
      <View style={styles.radioRow}>
        <TouchableOpacity
          style={[styles.radioChip, locale === 'en' && styles.radioChipSelected]}
          onPress={() => setLocale('en')}
        >
          <Text
            style={[
              styles.radioChipText,
              locale === 'en' && styles.radioChipTextSelected,
            ]}
          >
            English
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioChip, locale === 'nl' && styles.radioChipSelected]}
          onPress={() => setLocale('nl')}
        >
          <Text
            style={[
              styles.radioChipText,
              locale === 'nl' && styles.radioChipTextSelected,
            ]}
          >
            Nederlands
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.label}>{t('country')} (optional)</Text>
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
                  <Text style={[styles.modalItemText, language === item.code && styles.modalItemTextSelected]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setLanguageModalVisible(false)}>
              <Text style={styles.modalCloseText}>{t('close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={countryModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setCountryModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Select country</Text>
            <FlatList
              data={[{ code: '', name: 'None' }, ...countries]}
              keyExtractor={(c) => c.code || '_none'}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, (item.code ? countryCode === item.code : !countryCode) && styles.modalItemSelected]}
                  onPress={() => {
                    setCountryCode(item.code || null);
                    setCountryModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalItemText, (item.code ? countryCode === item.code : !countryCode) && styles.modalItemTextSelected]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setCountryModalVisible(false)}>
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
