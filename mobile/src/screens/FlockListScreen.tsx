import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import { listFlocks, setStoredMainFlockSlug, type Flock } from '../api/flocks';
import { getCountryDisplayName } from '../i18n/countryNames';
import { colors } from '../theme';
import { getFlockImage } from '../constants/birdrFlockImages';
import { GameArtImage } from '../components/GameArtImage';
import { useVisualStyle } from '../context/VisualStyleContext';
import { resolveMediaUrl } from '../api/config';

export function FlockListScreen() {
  const navigation = useNavigation();
  const { t, locale } = useTranslation();
  const { visualStyle } = useVisualStyle();
  const { isAuthenticated } = useAuth();
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setFlocks([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setFlocks(await listFlocks());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
      setFlocks([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, t]);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        (navigation as any).replace('Login');
        return;
      }
      setLoading(true);
      void load();
    }, [isAuthenticated, load, navigation])
  );

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
                    <GameArtImage
                      source={getFlockImage('leaderboard', visualStyle)}
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

          <View style={styles.subtleLinks}>
            <TouchableOpacity onPress={() => (navigation as any).navigate('FlockCreate')}>
              <Text style={styles.subtleLinkText}>{t('flocks_start_another')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => (navigation as any).navigate('FlockJoin')}>
              <Text style={styles.subtleLinkText}>{t('flocks_join_subtle')}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : !loading ? (
        <>
          <GameArtImage source={getFlockImage('invite', visualStyle)} style={styles.heroImage} resizeMode="contain" />
          <Text style={styles.hint}>{t('flocks_hint')}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => (navigation as any).navigate('FlockIntro')}
          >
            <Text style={styles.primaryButtonText}>{t('flocks_start')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => (navigation as any).navigate('FlockJoin')}
          >
            <Text style={styles.ghostButtonText}>{t('flocks_join_subtle')}</Text>
          </TouchableOpacity>
        </>
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
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  ghostButton: { paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  ghostButtonText: { color: colors.primary[500], fontSize: 16, fontWeight: '600' },
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
});
