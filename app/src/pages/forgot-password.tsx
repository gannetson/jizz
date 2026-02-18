import React, { useState } from "react";
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
  Link,
} from "@chakra-ui/react";
import { FormattedMessage, useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { authService } from "../api/services/auth.service";
import { Page } from "../shared/components/layout";

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const intl = useIntl();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Page>
        <Page.Header>
          <Heading color={'gray.800'} size={'lg'} m={0}>
            <FormattedMessage id="check_your_email" defaultMessage="Check Your Email" />
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
                  id="password_reset_email_sent"
                  defaultMessage="If an account with this email exists, a password reset link has been sent."
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
            <FormattedMessage id="back_to_login" defaultMessage="Back to Login" />
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
          <FormattedMessage id="forgot_password" defaultMessage="Forgot Password" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="md" py={8}>
          <VStack gap={6} align="stretch">

        <Text textAlign="center" color="gray.600">
          <FormattedMessage
            id="forgot_password_description"
            defaultMessage="Enter your email address and we'll send you a link to reset your password."
          />
        </Text>

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
              loading={loading}
              loadingText={intl.formatMessage({ id: 'sending', defaultMessage: 'Sending...' })}
            >
              <FormattedMessage id="send_reset_link" defaultMessage="Send Reset Link" />
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

export default ForgotPasswordPage;

