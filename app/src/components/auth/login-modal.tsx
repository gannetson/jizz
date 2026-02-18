import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  Input,
  Text,
  Separator,
  Alert,
  AlertIndicator,
  Field,
  useDisclosure,
  Dialog,
  Link,
} from "@chakra-ui/react";
import { FormattedMessage, useIntl } from "react-intl";
import { SiGoogle, SiApple } from "react-icons/si";
import { authService, AuthError } from "../../api/services/auth.service";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
};

export const LoginModal = ({ isOpen, onClose, defaultMode = 'login' }: LoginModalProps) => {
  const intl = useIntl();
  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const { open: showPassword, onToggle: togglePassword } = useDisclosure();

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
      setIsLogin(defaultMode === 'login');
      setShowForgotPassword(false);
      setEmail("");
      setPassword("");
      setUsername("");
      setError(null);
      setForgotPasswordSuccess(false);
    }
  }, [isOpen, defaultMode]);

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
      onClose();
      // Refresh the page to update auth state
      window.location.reload();
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setForgotPasswordLoading(true);

    try {
      await authService.requestPasswordReset(email);
      setForgotPasswordSuccess(true);
    } catch (err: any) {
      const authError = err as AuthError;
      setError(authError.message || "Failed to send password reset email");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e: { open: boolean }) => !e.open && onClose()}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="500px">
          <Dialog.CloseTrigger />
          <Dialog.Header>
            {showForgotPassword ? (
              <FormattedMessage id="forgot_password" defaultMessage="Forgot Password" />
            ) : isLogin ? (
              <FormattedMessage id="login" defaultMessage="Login" />
            ) : (
              <FormattedMessage id="register" defaultMessage="Register" />
            )}
          </Dialog.Header>
          <Dialog.Body>
          <VStack gap={6} align="stretch">
            {error && (
              <Alert.Root status="error">
                <AlertIndicator />
                <Alert.Content>
                  <Alert.Title>{error}</Alert.Title>
                </Alert.Content>
              </Alert.Root>
            )}

            {forgotPasswordSuccess && (
              <Alert.Root status="info">
                <AlertIndicator />
                <Alert.Content>
                  <Alert.Title>
                    <FormattedMessage
                      id="password_reset_email_sent"
                      defaultMessage="If an account with this email exists, a password reset link has been sent."
                    />
                  </Alert.Title>
                </Alert.Content>
              </Alert.Root>
            )}

            {showForgotPassword ? (
              /* Forgot Password Form */
              <Box as="form" onSubmit={handleForgotPassword}>
                <VStack gap={4} align="stretch">
                  <Text textAlign="center" color="gray.600" fontSize="sm">
                    <FormattedMessage
                      id="forgot_password_description"
                      defaultMessage="Enter your email address and we'll send you a link to reset your password."
                    />
                  </Text>

                  <Field.Root required>
                    <Field.Label>
                      <FormattedMessage id="email" defaultMessage="Email" />
                    </Field.Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'placeholder enter email', defaultMessage: 'Enter your email' })}
                      required
                    />
                  </Field.Root>

                  <Button
                    type="submit"
                    colorPalette="primary"
                    width="full"
                    loading={forgotPasswordLoading}
                    loadingText={intl.formatMessage({ id: 'sending', defaultMessage: 'Sending...' })}
                  >
                    <FormattedMessage id="send_reset_link" defaultMessage="Send Reset Link" />
                  </Button>

                  <Link
                    as="button"
                    type="button"
                    colorPalette="primary"
                    fontSize="sm"
                    textAlign="center"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setError(null);
                      setForgotPasswordSuccess(false);
                    }}
                  >
                    <FormattedMessage id="back_to_login" defaultMessage="Back to Login" />
                  </Link>
                </VStack>
              </Box>
            ) : (
              /* Email/Password Form */
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
                      placeholder={intl.formatMessage({ id: 'placeholder enter username', defaultMessage: 'Enter your username' })}
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
                    placeholder={intl.formatMessage({ id: 'placeholder enter email', defaultMessage: 'Enter your email' })}
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
                    placeholder={intl.formatMessage({ id: 'placeholder enter password', defaultMessage: 'Enter your password' })}
                    required
                    flex={1}
                  />
                  {isLogin && (
                    <Box mt={1}>
                      <Link
                        as="button"
                        type="button"
                        colorPalette="primary"
                        fontSize="sm"
                        onClick={() => {
                          setShowForgotPassword(true);
                          setError(null);
                        }}
                      >
                        <FormattedMessage id="forgot_password_link" defaultMessage="Forgot password?" />
                      </Link>
                    </Box>
                  )}
                </Field.Root>

                <Button
                  type="submit"
                  colorPalette="primary"
                  width="full"
                  loading={loading}
                  loadingText={isLogin ? intl.formatMessage({ id: 'logging in', defaultMessage: 'Logging in...' }) : intl.formatMessage({ id: 'registering', defaultMessage: 'Registering...' })}
                >
                  {isLogin ? (
                    <FormattedMessage id="login" defaultMessage="Login" />
                  ) : (
                    <FormattedMessage id="register" defaultMessage="Register" />
                  )}
                </Button>

                <HStack justify="center" gap={1}>
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
                  <Link
                    as="button"
                    type="button"
                    colorPalette="primary"
                    fontSize="sm"
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
                  </Link>
                </HStack>
              </VStack>
            </Box>
            )}

            {!showForgotPassword && (
              <>
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
            </VStack>
            </>
            )}
          </VStack>
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};

