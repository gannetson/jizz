import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import { getFlockInvitePreview, joinFlock, setStoredMainFlockSlug } from '../api/flocks';
import { resolveMediaUrl } from '../api/config';
import { getCountryDisplayName } from '../i18n/countryNames';
import { colors } from '../theme';
import { BIRDR_FLOCK_IMAGES } from '../constants/birdrFlockImages';

export function FlockInviteLandingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const inviteToken = (route.params as { inviteToken?: string })?.inviteToken;
  const { t, locale } = useTranslation();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof getFlockInvitePreview>> | null>(null);

  const load = useCallback(async () => {
    if (!inviteToken) return;
    setError(null);
    try {
      const data = await getFlockInvitePreview(inviteToken);
      setPreview(data);
      if (data.flock.is_member) {
        (navigation as any).replace('FlockDetail', { slug: data.flock.slug });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('flock_invite_invalid'));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [inviteToken, navigation, t]);

  useFocusEffect(
    useCallback(() => {
      if (inviteToken) {
        setLoading(true);
        load();
      }
    }, [inviteToken, load])
  );

  const handleJoin = async () => {
    if (!inviteToken) return;
    if (!isAuthenticated) {
      (navigation as any).navigate('Login');
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const result = await joinFlock({ token: inviteToken });
      await setStoredMainFlockSlug(result.flock.slug);
      (navigation as any).replace('FlockDetail', { slug: result.flock.slug });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('flock_join_failed'));
    } finally {
      setJoining(false);
    }
  };

  if (!inviteToken) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>{t('flock_invite_invalid')}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!preview) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? t('flock_invite_invalid')}</Text>
      </View>
    );
  }

  const { flock, active_challenge: challenge } = preview;
  const logoUri = resolveMediaUrl(flock.logo_url);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={BIRDR_FLOCK_IMAGES.invite} style={styles.heroImage} resizeMode="contain" />
      <Text style={styles.title}>{t('flock_invite_title')}</Text>
      <Text style={styles.hint}>{t('flock_invite_hint')}</Text>

      <View style={styles.previewCard}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="cover" />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>{flock.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.flockName}>{flock.name}</Text>
        <Text style={styles.meta}>
          {getCountryDisplayName(flock.default_country, locale)}
        </Text>
        <Text style={styles.meta}>{t('flock_member_count', { count: flock.member_count })}</Text>
        {challenge ? (
          <View style={styles.challengePreview}>
            <Text style={styles.challengeLabel}>{t('flock_active_challenge')}</Text>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.meta}>
              {challenge.length} {t('questions').toLowerCase()} · {t('flock_participants', { count: challenge.participant_count })}
            </Text>
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!isAuthenticated ? (
        <>
          <Text style={styles.authHint}>{t('flock_join_requires_login')}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => (navigation as any).navigate('Login')}>
            <Text style={styles.primaryButtonText}>{t('login')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.primaryButton, joining && styles.primaryButtonDisabled]}
          onPress={handleJoin}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator size="small" color={colors.primary[50]} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('flock_join')}</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  heroImage: { width: '100%', maxWidth: 280, height: 186, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 8 },
  hint: { fontSize: 14, color: colors.primary[600], marginBottom: 24 },
  previewCard: {
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginBottom: 24,
  },
  logo: { width: 80, height: 80, borderRadius: 40, marginBottom: 16 },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoPlaceholderText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  flockName: { fontSize: 20, fontWeight: '700', color: colors.primary[800], textAlign: 'center' },
  meta: { fontSize: 14, color: colors.primary[600], marginTop: 6, textAlign: 'center' },
  challengePreview: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primary[200],
    width: '100%',
    alignItems: 'center',
  },
  challengeLabel: { fontSize: 13, fontWeight: '600', color: colors.primary[600] },
  challengeTitle: { fontSize: 16, fontWeight: '600', color: colors.primary[800], marginTop: 4 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500], textAlign: 'center' },
  muted: { fontSize: 14, color: colors.primary[600] },
  authHint: { fontSize: 14, color: colors.primary[600], marginBottom: 12, textAlign: 'center' },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.primary[50], fontSize: 18, fontWeight: '600' },
});
