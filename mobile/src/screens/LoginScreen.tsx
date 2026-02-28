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
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getSocialLoginUrl } from '../api/auth';
import { colors } from '../theme';

export function LoginScreen() {
  const navigation = useNavigation();
  const route = useRoute<{ params?: { mode?: 'login' | 'register' }; name?: string }>();
  const auth = useAuth();
  const [isLogin, setIsLogin] = useState(route.params?.mode !== 'register' && route.name !== 'Register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        await auth.loginWithEmail(email.trim(), password);
      } else {
        await auth.register(email.trim(), password, username.trim() || undefined);
      }
      (navigation as any).goBack();
    } catch (e: any) {
      setError(e?.message ?? 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openSocialLogin = async (provider: 'google-oauth2' | 'apple-id') => {
    setError(null);
    const path = provider === 'google-oauth2' ? 'google' : 'apple';
    const redirectUri = `birdr://auth/${path}`;
    const authUrl = getSocialLoginUrl(provider, redirectUri);
    setSocialLoading(provider === 'google-oauth2' ? 'google' : 'apple');
    try {
      const canOpen = await Linking.canOpenURL(authUrl);
      if (canOpen) {
        await Linking.openURL(authUrl);
      } else {
        setError('Could not open sign-in.');
      }
    } catch (e) {
      setError('Could not open sign-in.');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{isLogin ? 'Login' : 'Register'}</Text>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {!isLogin && (
          <>
            <Text style={styles.label}>Username (optional)</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Choose a username"
              placeholderTextColor={colors.primary[400]}
              autoCapitalize="none"
            />
          </>
        )}
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          placeholderTextColor={colors.primary[400]}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor={colors.primary[400]}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleEmailSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary[50]} />
          ) : (
            <Text style={styles.primaryButtonText}>{isLogin ? 'Login' : 'Register'}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => { setIsLogin(!isLogin); setError(null); }}
        >
          <Text style={styles.toggleText}>
            {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.divider}>Or continue with</Text>

        <TouchableOpacity
          style={[styles.socialButton, styles.googleButton, socialLoading && styles.buttonDisabled]}
          onPress={async () => {
            setError(null);
            setSocialLoading('google');
            try {
              const didLogin = await auth.loginWithGoogle();
              if (didLogin) (navigation as any).goBack();
            } catch (e: any) {
              if (__DEV__) {
                console.error('[Google sign-in]', e?.message, e?.code ?? '', e);
              }
              setError(e?.message ?? 'Google sign-in failed.');
            } finally {
              setSocialLoading(null);
            }
          }}
          disabled={!!socialLoading}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.socialIcon}>G</Text>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.socialButton, styles.appleButton, socialLoading && styles.buttonDisabled]}
          onPress={() => openSocialLogin('apple-id')}
          disabled={!!socialLoading}
        >
          {socialLoading === 'apple' ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Text style={[styles.socialIcon, styles.appleIcon]}></Text>
              <Text style={[styles.socialButtonText, styles.appleButtonText]}>Continue with Apple</Text>
            </>
          )}
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
  toggleButton: { marginTop: 16, alignItems: 'center' },
  toggleText: { fontSize: 14, color: colors.primary[500] },
  divider: { fontSize: 14, color: colors.primary[600], textAlign: 'center', marginVertical: 24 },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  googleButton: { backgroundColor: '#4285F4' },
  appleButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000' },
  socialIcon: { fontSize: 20, fontWeight: '700', color: '#fff', marginRight: 10 },
  appleIcon: { color: '#000' },
  socialButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  appleButtonText: { color: '#000' },
});
