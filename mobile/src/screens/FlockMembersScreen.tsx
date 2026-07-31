import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from '../i18n/TranslationContext';
import {
  leaveFlock,
  listFlockMembers,
  removeFlockMember,
  type FlockMember,
} from '../api/flocks';
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<number | null>(null);
  const [canLeave, setCanLeave] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug) return;
    setError(null);
    try {
      const data = await listFlockMembers(slug);
      setMembers(data.members);
      setFlockName(data.flock_name);
      setIsAdmin(data.is_admin);
      setViewerUserId(data.viewer_user_id);
      setCanLeave(data.can_leave);
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

  const handleRemove = (member: FlockMember) => {
    if (!slug) return;
    Alert.alert(
      t('flocks_remove_member'),
      t('flocks_remove_member_confirm', { name: member.display_name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('flocks_remove_member'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setError(null);
              setBusyUserId(member.user_id);
              try {
                await removeFlockMember(slug, member.user_id);
                await load();
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : t('flocks_remove_member_failed'));
              } finally {
                setBusyUserId(null);
              }
            })();
          },
        },
      ]
    );
  };

  const handleLeave = () => {
    if (!slug) return;
    Alert.alert(t('flocks_leave'), t('flocks_leave_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('flocks_leave'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setError(null);
            setLeaving(true);
            try {
              await leaveFlock(slug);
              (navigation as any).navigate('FlockList');
            } catch (e: unknown) {
              setError(e instanceof Error ? e.message : t('flocks_leave_failed'));
              setLeaving(false);
            }
          })();
        },
      },
    ]);
  };

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
        members.map((m) => {
          const canRemove = isAdmin && m.role !== 'owner' && m.user_id !== viewerUserId;
          return (
            <View key={m.user_id} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{m.display_name}</Text>
                <Text style={styles.role}>{t(roleKey(m.role))}</Text>
              </View>
              {canRemove ? (
                busyUserId === m.user_id ? (
                  <ActivityIndicator size="small" color={colors.error[500]} />
                ) : (
                  <TouchableOpacity onPress={() => handleRemove(m)} hitSlop={8}>
                    <Text style={styles.removeText}>{t('flocks_remove_member')}</Text>
                  </TouchableOpacity>
                )
              ) : null}
            </View>
          );
        })
      )}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => (navigation as any).navigate('FlockInvite', { slug })}
      >
        <Text style={styles.primaryButtonText}>{t('flock_invite_members')}</Text>
      </TouchableOpacity>
      {canLeave ? (
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={handleLeave}
          disabled={leaving}
        >
          {leaving ? (
            <ActivityIndicator size="small" color={colors.error[500]} />
          ) : (
            <Text style={styles.dangerButtonText}>{t('flocks_leave')}</Text>
          )}
        </TouchableOpacity>
      ) : null}
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
    gap: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: colors.primary[800] },
  role: { fontSize: 13, color: colors.primary[500], marginTop: 2 },
  removeText: { fontSize: 14, fontWeight: '600', color: colors.error[500] },
  errorText: { color: colors.error[500], marginBottom: 12 },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.error[500],
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  dangerButtonText: { color: colors.error[500], fontSize: 16, fontWeight: '600' },
  linkButton: { alignItems: 'center', marginTop: 16 },
  linkButtonText: { color: colors.primary[500], fontWeight: '600' },
});
