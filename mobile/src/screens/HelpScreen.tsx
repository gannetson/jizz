import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { loadHelpPages, PageListItem } from '../api/pages';
import { colors } from '../theme';

export function HelpOverviewScreen({ onPageSelect }: { onPageSelect?: (slug: string) => void }) {
  const navigation = useNavigation<{ navigate: (s: string, p?: { slug: string }) => void }>();
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHelpPages()
      .then(setPages)
      .catch((e) => setError(e.message ?? 'Failed to load help pages'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (slug: string) => {
    if (onPageSelect) onPageSelect(slug);
    else navigation.navigate('HelpDetail', { slug });
  };

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
      <Text style={styles.screenTitle}>Help</Text>
      {pages.length === 0 ? (
        <Text style={styles.emptyText}>No help pages available.</Text>
      ) : (
        pages.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.linkRow}
            onPress={() => handleSelect(p.slug)}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>{p.title}</Text>
          </TouchableOpacity>
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
  linkRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.primary[200] },
  linkText: { fontSize: 17, color: colors.primary[500], textDecorationLine: 'underline' },
});
