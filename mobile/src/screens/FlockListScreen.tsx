import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import {
  listFlocks,
  createFlock,
  joinFlock,
  setStoredMainFlockSlug,
  type Flock,
} from '../api/flocks';
import type { Country } from '../api/countries';
import { getCountryDisplayName } from '../i18n/countryNames';
import { CountrySelect } from '../components/CountrySelect';
import { colors } from '../theme';
import { BIRDR_FLOCK_IMAGES } from '../constants/birdrFlockImages';
import { resolveMediaUrl } from '../api/config';

export function FlockListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const openCreateParam = (route.params as { openCreate?: boolean } | undefined)?.openCreate;
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [showCreate, setShowCreate] = useState(!!openCreateParam);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setFlocks([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const list = await listFlocks();
      setFlocks(list);
      if (openCreateParam && list.length === 0) {
        setShowCreate(true);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('failed_load');
      setError(msg);
      setFlocks([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, openCreateParam, t]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        (navigation as any).replace('Login');
        return;
      }
      setLoading(true);
      if (openCreateParam) setShowCreate(true);
      load();
    }, [isAuthenticated, load, navigation, openCreateParam])
  );

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || !selectedCountry) return;
    setCreating(true);
    setError(null);
    try {
      const flock = await createFlock({ name, country_code: selectedCountry.code });
      setNewName('');
      setSelectedCountry(null);
      setShowCreate(false);
      await setStoredMainFlockSlug(flock.slug);
      (navigation as any).navigate('FlockDetail', { slug: flock.slug });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('flock_create_failed'));
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    setJoining(true);
    setError(null);
    try {
      const result = await joinFlock({ code });
      setJoinCode('');
      setShowCreate(false);
      await setStoredMainFlockSlug(result.flock.slug);
      (navigation as any).navigate('FlockDetail', { slug: result.flock.slug });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('flock_join_failed'));
    } finally {
      setJoining(false);
    }
  };

  const openFlock = async (flock: Flock) => {
    await setStoredMainFlockSlug(flock.slug);
    (navigation as any).navigate('FlockDetail', { slug: flock.slug });
  };

  if (!isAuthenticated) return null;

  const hasFlocks = flocks.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>{t('flocks')}</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && flocks.length === 0 ? (
        <ActivityIndicator size="small" color={colors.primary[500]} style={styles.loader} />
      ) : null}

      {hasFlocks ? (
        <>
          <Text style={styles.sectionTitle}>{t('my_flocks')}</Text>
          {flocks.map((f) => {
            const logoUri = resolveMediaUrl(f.logo_url);
            return (
              <TouchableOpacity key={f.id} style={styles.card} onPress={() => void openFlock(f)}>
                <View style={styles.cardRow}>
                  {logoUri ? (
                    <Image source={{ uri: logoUri }} style={styles.cardLogo} resizeMode="cover" />
                  ) : (
                    <Image
                      source={BIRDR_FLOCK_IMAGES.leaderboard}
                      style={styles.cardLogoPlaceholder}
                      resizeMode="contain"
                    />
                  )}
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>{f.name}</Text>
                    <Text style={styles.cardMeta}>
                      {getCountryDisplayName(f.default_country, locale)}
                      {' · '}
                      {t('flock_member_count', { count: f.member_count })}
                      {f.active_challenge ? ` · ${f.active_challenge.title}` : ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {!showCreate ? (
            <View style={styles.subtleLinks}>
              <TouchableOpacity onPress={() => (navigation as any).navigate('FlockIntro')}>
                <Text style={styles.subtleLinkText}>{t('flocks_start_another')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCreate(true)}>
                <Text style={styles.subtleLinkText}>{t('flocks_join_subtle')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      ) : !loading ? (
        <>
          <Image source={BIRDR_FLOCK_IMAGES.invite} style={styles.heroImage} resizeMode="contain" />
          <Text style={styles.hint}>{t('flocks_hint')}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => (navigation as any).navigate('FlockIntro')}
          >
            <Text style={styles.primaryButtonText}>{t('flocks_start')}</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {showCreate ? (
        <View style={styles.createBox}>
          <Text style={styles.sectionTitle}>{t('flocks_join_subtle')}</Text>
          <View style={styles.joinRow}>
            <TextInput
              style={[styles.input, styles.joinInput]}
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.toUpperCase())}
              placeholder="AB12CD"
              placeholderTextColor={colors.primary[400]}
              autoCapitalize="characters"
              maxLength={12}
            />
            <TouchableOpacity
              style={[
                styles.joinButton,
                (joinCode.trim().length < 4 || joining) && styles.primaryButtonDisabled,
              ]}
              onPress={() => void handleJoinByCode()}
              disabled={joinCode.trim().length < 4 || joining}
            >
              {joining ? (
                <ActivityIndicator size="small" color={colors.primary[50]} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('flock_join')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>{t('new_flock')}</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder={t('flock_name_placeholder')}
            placeholderTextColor={colors.primary[400]}
          />
          <CountrySelect
            value={selectedCountry}
            onChange={setSelectedCountry}
            style={styles.countrySelect}
            testID="flocks.selectCountry"
          />
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!newName.trim() || !selectedCountry || creating) && styles.primaryButtonDisabled,
            ]}
            onPress={handleCreate}
            disabled={!newName.trim() || !selectedCountry || creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color={colors.primary[50]} />
            ) : (
              <Text style={styles.primaryButtonText}>{t('create_flock')}</Text>
            )}
          </TouchableOpacity>
          {hasFlocks ? (
            <TouchableOpacity style={styles.subtleLinks} onPress={() => setShowCreate(false)}>
              <Text style={styles.subtleLinkText}>{t('close')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 16 },
  heroImage: { width: '100%', maxWidth: 260, height: 170, alignSelf: 'center', marginBottom: 12 },
  hint: { fontSize: 14, color: colors.primary[600], marginBottom: 24, textAlign: 'center' },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary[800],
    marginBottom: 12,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.primary[800],
    marginBottom: 12,
  },
  joinRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  joinInput: { flex: 1, marginBottom: 0, fontFamily: 'Courier', letterSpacing: 1 },
  joinButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  countrySelect: { marginBottom: 12 },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  loader: { marginVertical: 24 },
  card: {
    backgroundColor: colors.primary[50],
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLogo: { width: 56, height: 56, borderRadius: 8 },
  cardLogoPlaceholder: { width: 56, height: 56 },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  cardMeta: { fontSize: 13, color: colors.primary[600], marginTop: 4 },
  subtleLinks: { alignItems: 'center', marginTop: 12, marginBottom: 8, gap: 10 },
  subtleLinkText: { fontSize: 14, color: colors.primary[500], fontWeight: '600' },
  createBox: { marginTop: 8 },
});
