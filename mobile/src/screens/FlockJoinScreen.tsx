import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/TranslationContext';
import { joinFlock, setStoredMainFlockSlug } from '../api/flocks';
import { colors } from '../theme';

export function FlockJoinScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated) {
        (navigation as any).replace('Login');
      }
    }, [isAuthenticated, navigation])
  );

  if (!isAuthenticated) return null;

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    setJoining(true);
    setError(null);
    try {
      const result = await joinFlock({ code });
      await setStoredMainFlockSlug(result.flock.slug);
      (navigation as any).replace('FlockDetail', { slug: result.flock.slug });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('flock_join_failed'));
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('flock_join')}</Text>
      <Text style={styles.hint}>{t('flocks_join_code_hint')}</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        value={joinCode}
        onChangeText={(v) => setJoinCode(v.toUpperCase())}
        placeholder="AB12CD"
        placeholderTextColor={colors.primary[400]}
        autoCapitalize="characters"
        autoFocus
        maxLength={12}
        testID="flocks.join.code"
      />
      <TouchableOpacity
        style={[
          styles.primaryButton,
          (joinCode.trim().length < 4 || joining) && styles.primaryButtonDisabled,
        ]}
        onPress={() => void handleJoin()}
        disabled={joinCode.trim().length < 4 || joining}
        testID="flocks.join.submit"
      >
        {joining ? (
          <ActivityIndicator size="small" color={colors.primary[50]} />
        ) : (
          <Text style={styles.primaryButtonText}>{t('flock_join')}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.ghostButton}
        onPress={() => (navigation as any).navigate('FlockCreate')}
      >
        <Text style={styles.ghostButtonText}>{t('flocks_intro_cta')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', color: colors.primary[800], marginBottom: 8 },
  hint: { fontSize: 15, color: colors.primary[600], marginBottom: 20, lineHeight: 22 },
  errorBox: { backgroundColor: colors.error[50], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[500] },
  input: {
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.primary[800],
    marginBottom: 16,
    fontFamily: 'Courier',
    letterSpacing: 1,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  ghostButton: { paddingVertical: 14, alignItems: 'center' },
  ghostButtonText: { color: colors.primary[500], fontSize: 16 },
});
