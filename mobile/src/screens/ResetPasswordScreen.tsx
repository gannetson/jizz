import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from '../i18n/TranslationContext';
import { confirmPasswordReset } from '../api/auth';
import { colors } from '../theme';

type ResetPasswordParams = { uid?: string; token?: string };

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: ResetPasswordParams }, 'params'>>();
  const params = route.params ?? {};
  const uid = params.uid ?? '';
  const token = params.token ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!uid || !token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [uid, token]);

  const handleSubmit = async () => {
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!uid || !token) {
      setError('Invalid reset link.');
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(uid, token, password);
      setSuccess(true);
      setTimeout(() => (navigation as any).replace('Login'), 2000);
    } catch (e: any) {
      setError(e?.message ?? 'Invalid or expired link. Request a new reset.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('password_reset_success')}</Text>
        <View style={styles.successBox}>
          <Text style={styles.successText}>{t('password_reset_success_message')}</Text>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => (navigation as any).replace('Login')}>
          <Text style={styles.secondaryButtonText}>{t('back_to_login')}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('reset_password')}</Text>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Text style={styles.label}>{t('new_password')}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t('new_password')}
          placeholderTextColor={colors.primary[400]}
          secureTextEntry
        />
        <Text style={styles.label}>{t('confirm_password')}</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t('confirm_password')}
          placeholderTextColor={colors.primary[400]}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.primaryButton, (loading || !uid || !token) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || !uid || !token}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary[50]} />
          ) : (
            <Text style={styles.primaryButtonText}>{t('reset_password')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => (navigation as any).navigate('Login')}>
          <Text style={styles.backButtonText}>{t('back_to_login')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary[800], marginBottom: 24, textAlign: 'center' },
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
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: colors.primary[50], fontSize: 16, fontWeight: '600' },
  secondaryButton: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { fontSize: 16, color: colors.primary[500], fontWeight: '600' },
  backButton: { marginTop: 24, alignItems: 'center' },
  backButtonText: { fontSize: 14, color: colors.primary[500] },
});
