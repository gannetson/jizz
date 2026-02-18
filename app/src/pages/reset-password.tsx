import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  VStack,
  Input,
  Text,
  Heading,
  Container,
  Field,
  Alert,
  AlertIndicator,
  useDisclosure,
  HStack,
  Link,
} from "@chakra-ui/react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";
import { authService } from "../api/services/auth.service";
import { Page } from "../shared/components/layout";

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { open: showPassword, onToggle: togglePassword } = useDisclosure();
  const { open: showConfirmPassword, onToggle: toggleConfirmPassword } = useDisclosure();

  useEffect(() => {
    if (!uid || !token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [uid, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!uid || !token) {
      setError("Invalid reset link");
      return;
    }

    setLoading(true);

    try {
      await authService.confirmPasswordReset(uid, token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Page>
        <Page.Header>
          <Heading color={'gray.800'} size={'lg'} m={0}>
            <FormattedMessage id="password_reset_success" defaultMessage="Password Reset Successful" />
          </Heading>
        </Page.Header>
        <Page.Body>
          <Container maxW="md" py={8}>
            <VStack gap={6} align="stretch">
          <Alert.Root status="info">
            <AlertIndicator />
            <Alert.Content>
              <Alert.Title>
                <FormattedMessage
                  id="password_reset_success_message"
                  defaultMessage="Your password has been reset successfully. Redirecting to login..."
                />
              </Alert.Title>
            </Alert.Content>
          </Alert.Root>
          <Link
            href="/login"
            colorPalette="primary"
            fontSize="sm"
            textAlign="center"
            display="block"
          >
            <FormattedMessage id="go_to_login" defaultMessage="Go to Login" />
          </Link>
            </VStack>
          </Container>
        </Page.Body>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Heading color={'gray.800'} size={'lg'} m={0}>
          <FormattedMessage id="reset_password" defaultMessage="Reset Password" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="md" py={8}>
          <VStack gap={6} align="stretch">

        {error && (
          <Alert.Root status="error">
            <AlertIndicator />
            <Alert.Content>
              <Alert.Title>{error}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        )}

        <Box as="form" onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>
                <FormattedMessage id="new_password" defaultMessage="New Password" />
              </Field.Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'placeholder enter new password', defaultMessage: 'Enter new password' })}
                  required
                  flex={1}
                />
            </Field.Root>

            <Field.Root required>
              <Field.Label>
                <FormattedMessage id="confirm_password" defaultMessage="Confirm Password" />
              </Field.Label>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'placeholder confirm new password', defaultMessage: 'Confirm new password' })}
                  required
                  flex={1}
                />
            </Field.Root>

            <Button
              type="submit"
              colorPalette="primary"
              width="full"
              loading={loading}
              loadingText={intl.formatMessage({ id: 'resetting', defaultMessage: 'Resetting...' })}
            >
              <FormattedMessage id="reset_password" defaultMessage="Reset Password" />
            </Button>

            <Link
              href="/login"
              colorPalette="primary"
              fontSize="sm"
              textAlign="center"
              display="block"
            >
              <FormattedMessage id="back_to_login" defaultMessage="Back to Login" />
            </Link>
          </VStack>
        </Box>
          </VStack>
        </Container>
      </Page.Body>
    </Page>
  );
};

export default ResetPasswordPage;

