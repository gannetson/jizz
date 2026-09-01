import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from '../i18n/TranslationContext';
import {
  getFlock,
  rotateFlockInvite,
  flockInviteUrl,
  buildFlockInviteShareMessage,
  type Flock,
} from '../api/flocks';
import { colors } from '../theme';
import { getFlockImage } from '../constants/birdrFlockImages';
import { GameArtImage } from '../components/GameArtImage';
import { useVisualStyle } from '../context/VisualStyleContext';

export function FlockInviteScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const slug = (route.params as { slug?: string })?.slug;
  const { t, locale } = useTranslation();
  const { visualStyle } = useVisualStyle();
  const [flock, setFlock] = useState<Flock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setError(null);
    try {
      setFlock(await getFlock(slug));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
      setFlock(null);
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const inviteLink = flockInviteUrl(flock?.invite);
  const shareMessage = useMemo(() => {
    if (flock?.invite?.share_message) return flock.invite.share_message;
    if (flock && inviteLink) return buildFlockInviteShareMessage(flock.name, inviteLink, locale);
    return '';
  }, [flock, inviteLink, locale]);

  const copyLink = useCallback(async () => {
    if (!inviteLink) return;
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteLink]);

  const inviteWhatsApp = useCallback(() => {
    if (!shareMessage) return;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`).catch(() => {});
  }, [shareMessage]);

  const handleRotate = async () => {
    if (!slug) return;
    setRotating(true);
    setError(null);
    try {
      await rotateFlockInvite(slug);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('flock_rotate_invite_failed'));
    } finally {
      setRotating(false);
    }
  };

  if (loading && !flock) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>{t('flock_invite_members')}</Text>
      {flock ? <Text style={styles.meta}>{flock.name}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <GameArtImage source={getFlockImage('invite', visualStyle)} style={styles.heroImage} resizeMode="contain" />

      {flock?.invite && inviteLink ? (
        <View style={styles.shareCard}>
          {flock.invite.code ? (
            <Text style={styles.inviteCode}>
              {t('flock_invite_code')}: <Text style={styles.inviteCodeValue}>{flock.invite.code}</Text>
            </Text>
          ) : null}
          <Text style={styles.shareLabel}>{t('flock_invite_link')}</Text>
          <View style={styles.linkBox}>
            <Text style={styles.linkText} selectable numberOfLines={3}>
              {inviteLink}
            </Text>
          </View>
          <View style={styles.shareButtons}>
            <TouchableOpacity style={styles.copyButton} onPress={copyLink}>
              <Text style={styles.copyButtonText}>{copied ? t('copied') : t('copy_link')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.whatsappButton} onPress={inviteWhatsApp}>
              <Text style={styles.whatsappButtonText}>{t('invite_whatsapp')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <QRCode value={inviteLink} size={160} backgroundColor="#fff" color={colors.primary[800]} />
            </View>
          </View>
          {flock.is_admin ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => void handleRotate()}
              disabled={rotating}
            >
              <Text style={styles.secondaryButtonText}>{t('flock_rotate_invite')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <Text style={styles.meta}>{t('flocks_invite_unavailable')}</Text>
      )}

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => (navigation as any).navigate('FlockDetail', { slug })}
      >
        <Text style={styles.linkButtonText}>{t('back_to_flock')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 4 },
  meta: { fontSize: 14, color: colors.primary[600], marginBottom: 16 },
  heroImage: { width: '100%', maxWidth: 260, height: 170, alignSelf: 'center', marginBottom: 16 },
  shareCard: {
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  inviteCode: { fontSize: 14, color: colors.primary[700], marginBottom: 10 },
  inviteCodeValue: { fontWeight: '700', letterSpacing: 1 },
  shareLabel: { fontSize: 13, fontWeight: '600', color: colors.primary[700], marginBottom: 6 },
  linkBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primary[200],
    marginBottom: 12,
  },
  linkText: { fontSize: 13, color: colors.primary[800] },
  shareButtons: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  copyButton: {
    flex: 1,
    backgroundColor: colors.primary[500],
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: { color: colors.primary[50], fontWeight: '600' },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25D366',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  whatsappButtonText: { color: '#fff', fontWeight: '600' },
  qrContainer: { alignItems: 'center', marginBottom: 16 },
  qrBox: { padding: 12, backgroundColor: '#fff', borderRadius: 8 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: { color: colors.primary[700], fontWeight: '600' },
  errorText: { color: colors.error[500], marginBottom: 12 },
  linkButton: { alignItems: 'center', marginTop: 20 },
  linkButtonText: { color: colors.primary[500], fontWeight: '600' },
});
