import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loadUpdates, UpdateListItem } from '../api/updates';
import { useTranslation } from '../i18n/TranslationContext';
import { useGame } from '../context/GameContext';
import { colors } from '../theme';

function formatDate(s: string) {
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return s;
  }
}

function UpdateRow({ update, onPress }: { update: UpdateListItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{update.title}</Text>
      </View>
      <Text style={styles.cardExcerpt} numberOfLines={3}>
        {update.excerpt}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardAuthor}>{update.user?.first_name ?? update.user?.username}</Text>
        <Text style={styles.cardDate}>{formatDate(update.created)}</Text>
      </View>
      {update.thumbs_up_count > 0 && (
        <Text style={styles.thumbsCount}>👍 {update.thumbs_up_count}</Text>
      )}
    </TouchableOpacity>
  );
}

export function UpdatesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { player } = useGame();
  const [updates, setUpdates] = useState<UpdateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    loadUpdates(player?.token)
      .then(setUpdates)
      .catch((e) => setError(e.message ?? t('error_load_updates')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [player?.token]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>{t('updates')}</Text>
      {updates.length === 0 ? (
        <Text style={styles.emptyText}>{t('no_updates_yet')}</Text>
      ) : (
        updates.map((u) => (
          <UpdateRow
            key={u.id}
            update={u}
            onPress={() => navigation.navigate('UpdateDetail', { updateId: u.id })}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingTop: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  screenTitle: { fontSize: 22, fontWeight: '600', color: colors.primary[800], marginBottom: 20 },
  errorText: { fontSize: 16, color: colors.error[500] },
  emptyText: { fontSize: 16, color: colors.primary[600] },
  card: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  cardHeader: {
    backgroundColor: colors.primary[200],
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.primary[800] },
  cardExcerpt: { fontSize: 15, color: colors.primary[800], padding: 14, lineHeight: 22 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  cardAuthor: { fontSize: 14, color: colors.primary[600] },
  cardDate: { fontSize: 14, fontStyle: 'italic', color: colors.primary[600] },
  thumbsCount: { paddingHorizontal: 14, paddingBottom: 12, color: colors.primary[600], fontSize: 14 },
});
