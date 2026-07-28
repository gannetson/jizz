import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../i18n/TranslationContext';
import { listFlockMembers, type FlockMember } from '../api/flocks';
import { colors } from '../theme';

function roleKey(role: string): string {
  if (role === 'owner') return 'flocks_role_owner';
  if (role === 'admin') return 'flocks_role_admin';
  return 'flocks_role_member';
}

export function FlockMembersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const slug = (route.params as { slug?: string })?.slug;
  const { t } = useTranslation();
  const [members, setMembers] = useState<FlockMember[]>([]);
  const [flockName, setFlockName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setError(null);
    try {
      const data = await listFlockMembers(slug);
      setMembers(data.members);
      setFlockName(data.flock_name);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('failed_load'));
      setMembers([]);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={styles.title}>{t('flock_members')}</Text>
      {flockName ? <Text style={styles.meta}>{flockName}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {loading && members.length === 0 ? (
        <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginVertical: 24 }} />
      ) : (
        members.map((m) => (
          <View key={m.user_id} style={styles.row}>
            <Text style={styles.name}>{m.display_name}</Text>
            <Text style={styles.role}>{t(roleKey(m.role))}</Text>
          </View>
        ))
      )}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => (navigation as any).navigate('FlockInvite', { slug })}
      >
        <Text style={styles.primaryButtonText}>{t('flock_invite_members')}</Text>
      </TouchableOpacity>
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
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 4 },
  meta: { fontSize: 14, color: colors.primary[600], marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.primary[800], flex: 1 },
  role: { fontSize: 13, color: colors.primary[500] },
  errorText: { color: colors.error[500], marginBottom: 12 },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  linkButton: { alignItems: 'center', marginTop: 16 },
  linkButtonText: { color: colors.primary[500], fontWeight: '600' },
});
