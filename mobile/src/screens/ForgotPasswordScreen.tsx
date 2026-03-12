import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from '../i18n/TranslationContext';
import { requestPasswordReset } from '../api/auth';
import { API_BASE_URL } from '../api/config';
import { colors } from '../theme';

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email.trim(), API_BASE_URL.replace(/\/$/, ''));
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('forgot_password_title')}</Text>
        <View style={styles.successBox}>
          <Text style={styles.successText}>{t('password_reset_email_sent')}</Text>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => (navigation as any).navigate('Login')}>
          <Text style={styles.secondaryButtonText}>{t('back_to_login')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('forgot_password_title')}</Text>
        <Text style={styles.description}>{t('forgot_password_description')}</Text>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor={colors.primary[400]}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary[50]} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('send_reset_link')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => (navigation as any).goBack()}>
          <Text style={styles.backButtonText}>{t('back_to_login')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary[800], marginBottom: 12, textAlign: 'center' },
  description: { fontSize: 15, color: colors.primary[600], marginBottom: 24, textAlign: 'center' },
  errorBox: { backgroundColor: colors.error[100], padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14, color: colors.error[700] },
  successBox: { backgroundColor: colors.primary[50], padding: 16, borderRadius: 8, marginBottom: 24 },
  successText: { fontSize: 15, color: colors.primary[800] },
  label: { fontSize: 14, fontWeight: '600', color: colors.primary[800], marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.primary[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.primary[800],
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  secondaryButton: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { fontSize: 16, color: colors.primary[500], fontWeight: '600' },
  backButton: { marginTop: 24, alignItems: 'center' },
  backButtonText: { fontSize: 14, color: colors.primary[500] },
});
