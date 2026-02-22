import React, { useState } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  Input,
  Text,
  Heading,
  Separator,
  Alert,
  AlertIndicator,
  Field,
  useDisclosure,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FormattedMessage } from "react-intl";
import { SiGoogle, SiApple } from "react-icons/si";
import { authService, AuthError } from "../../api/services/auth.service";

export const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { open: showPassword, onToggle: togglePassword } = useDisclosure();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let tokens;
      if (isLogin) {
        tokens = await authService.loginWithEmail({ email, password });
      } else {
        tokens = await authService.register({ email, password, username });
      }

      authService.storeTokens(tokens);
      navigate("/start");
    } catch (err: any) {
      const authError = err as AuthError;
      setError(authError.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const handleSocialLogin = (provider: 'google-oauth2' | 'apple-id') => {
    setError(null);
    // Redirect to Django's OAuth endpoint
    // Django will handle the OAuth flow and redirect back to our callback
    const redirectUri = `${window.location.origin}/login/${provider === 'google-oauth2' ? 'google' : 'apple'}`;
    const authUrl = authService.getSocialLoginUrl(provider, redirectUri);
    window.location.href = authUrl;
  };

  return (
    <Box maxW="400px" mx="auto" mt={8} p={6}>
      <VStack gap={6} align="stretch">
        <Heading size="lg" textAlign="center" colorPalette="primary">
          {isLogin ? (
            <FormattedMessage id="login" defaultMessage="Login" />
          ) : (
            <FormattedMessage id="register" defaultMessage="Register" />
          )}
        </Heading>

        {error && (
          <Alert.Root status="error">
            <AlertIndicator />
            <Alert.Content>
              <Alert.Title>{error}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        {/* Email/Password Form */}
        <Box as="form" onSubmit={handleEmailLogin}>
          <VStack gap={4} align="stretch">
            {!isLogin && (
              <Field.Root>
                <Field.Label>
                  <FormattedMessage id="username" defaultMessage="Username" />
                </Field.Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required={!isLogin}
                />
              </Field.Root>
            )}

            <Field.Root required>
              <Field.Label>
                <FormattedMessage id="email" defaultMessage="Email" />
              </Field.Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </Field.Root>

            <Field.Root required>
              <Field.Label>
                <FormattedMessage id="password" defaultMessage="Password" />
              </Field.Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  flex={1}
                />
            </Field.Root>

            <Button
              type="submit"
              colorPalette="primary"
              width="full"
              loading={loading}
              loadingText={isLogin ? "Logging in..." : "Registering..."}
            >
              {isLogin ? (
                <FormattedMessage id="login" defaultMessage="Login" />
              ) : (
                <FormattedMessage id="register" defaultMessage="Register" />
              )}
            </Button>

            <HStack justify="center">
              <Text fontSize="sm" color="gray.600">
                {isLogin ? (
                  <FormattedMessage
                    id="no_account"
                    defaultMessage="Don't have an account?"
                  />
                ) : (
                  <FormattedMessage
                    id="have_account"
                    defaultMessage="Already have an account?"
                  />
                )}
              </Text>
              <Button
                variant="plain"
                colorPalette="primary"
                size="sm"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
              >
                {isLogin ? (
                  <FormattedMessage id="register" defaultMessage="Register" />
                ) : (
                  <FormattedMessage id="login" defaultMessage="Login" />
                )}
              </Button>
            </HStack>
          </VStack>
        </Box>

        <Separator />

        {/* Social Login Options */}
        <VStack gap={3} align="stretch">
          <Text textAlign="center" fontSize="sm" color="gray.600">
            <FormattedMessage
              id="or_continue_with"
              defaultMessage="Or continue with"
            />
          </Text>

          {/* Google Login - Uses Django backend OAuth */}
          <Button
            colorPalette="error"
            width="full"
            onClick={() => handleSocialLogin('google-oauth2')}
            disabled={loading}
          >
            <HStack gap={2}>
              <SiGoogle size={20} />
              <Text>
                <FormattedMessage
                  id="login_with_google"
                  defaultMessage="Continue with Google"
                />
              </Text>
            </HStack>
          </Button>

          {/* Apple Login - Uses Django backend OAuth or token */}
          <Button
            colorPalette="neutral"
            width="full"
            variant="outline"
            onClick={() => handleSocialLogin('apple-id')}
            disabled={loading}
          >
            <HStack gap={2}>
              <SiApple size={20} />
              <Text>
                <FormattedMessage
                  id="login_with_apple"
                  defaultMessage="Continue with Apple"
                />
              </Text>
            </HStack>
          </Button>

        </VStack>
      </VStack>
    </Box>
  );
};
