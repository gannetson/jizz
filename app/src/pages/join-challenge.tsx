import React, { useState, useEffect } from "react";
import {
  VStack,
  Text,
  Heading,
  Container,
  Button,
  Spinner,
  Alert,
  AlertIndicator,
} from "@chakra-ui/react";
import { FormattedMessage } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";
import {
  getChallengeAcceptInfo,
  acceptChallengeByToken,
} from "../api/services/daily-challenge.service";
import { authService } from "../api/services/auth.service";
import { Page } from "../shared/components/layout";

export const JoinChallengePage = () => {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ challenge_id: number; accept_url: string } | null>(null);

  useEffect(() => {
    if (!inviteToken) {
      setLoading(false);
      setError("Invalid invite link");
      return;
    }
    getChallengeAcceptInfo(inviteToken)
      .then((data) => {
        setInfo({ challenge_id: data.challenge_id, accept_url: data.accept_url });
        setError(null);
      })
      .catch((e: any) => {
        setError(e?.message ?? "Invalid or expired invite");
        setInfo(null);
      })
      .finally(() => setLoading(false));
  }, [inviteToken]);

  const handleAccept = async () => {
    if (!inviteToken || !authService.getAccessToken()) {
      navigate("/login", { state: { returnTo: `/join/challenge/${inviteToken}` } });
      return;
    }
    setAccepting(true);
    setError(null);
    try {
      const challenge = await acceptChallengeByToken(inviteToken);
      navigate(`/daily-challenge/${challenge.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to accept invite");
    } finally {
      setAccepting(false);
    }
  };

  if (!inviteToken) {
    return (
      <Page>
        <Page.Body>
          <Container maxW="container.sm" py={8}>
            <Alert.Root status="error">
              <AlertIndicator />
              <Alert.Content>
                <Alert.Title><FormattedMessage id="invalid_invite" defaultMessage="Invalid invite link" /></Alert.Title>
              </Alert.Content>
            </Alert.Root>
          </Container>
        </Page.Body>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <Page.Header>
          <Heading color="gray.800" size="lg" m={0}>
            <FormattedMessage id="daily_challenge_invite" defaultMessage="Daily challenge invite" />
          </Heading>
        </Page.Header>
        <Page.Body>
          <VStack gap={4} py={8}>
            <Spinner size="xl" colorPalette="primary" />
            <Text><FormattedMessage id="loading" defaultMessage="Loading..." /></Text>
          </VStack>
        </Page.Body>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          <FormattedMessage id="daily_challenge_invite" defaultMessage="Daily challenge invite" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.sm" py={8}>
          {error && (
            <Alert.Root status="error" mb={4}>
              <AlertIndicator />
              <Alert.Content>
                <Alert.Title>{error}</Alert.Title>
              </Alert.Content>
            </Alert.Root>
          )}

          {info && (
            <VStack gap={4} align="stretch">
              <Text>
                <FormattedMessage
                  id="accept_invite_prompt"
                  defaultMessage="You've been invited to a daily challenge. Accept to join."
                />
              </Text>
              {!authService.getAccessToken() ? (
                <Button
                  colorPalette="primary"
                  onClick={() => navigate("/login", { state: { returnTo: `/join/challenge/${inviteToken}` } })}
                >
                  <FormattedMessage id="login_to_accept" defaultMessage="Log in to accept" />
                </Button>
              ) : (
                <Button
                  colorPalette="primary"
                  onClick={handleAccept}
                  disabled={accepting}
                  loading={accepting}
                >
                  <FormattedMessage id="accept_invite" defaultMessage="Accept invite" />
                </Button>
              )}
            </VStack>
          )}
        </Container>
      </Page.Body>
    </Page>
  );
};

export default JoinChallengePage;
