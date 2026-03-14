import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  VStack,
  Text,
  Heading,
  Container,
  Button,
  Spinner,
  Alert,
  AlertIndicator,
  Box,
} from "@chakra-ui/react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import { listDailyChallenges, type DailyChallenge } from "../../api/services/daily-challenge.service";
import { authService } from "../../api/services/auth.service";
import { Page } from "../../shared/components/layout";
import AppContext from "../../core/app-context";
import { getCountryDisplayName } from "../../data/country-names-nl";

export const DailyChallengeListPage = () => {
  const navigate = useNavigate();
  const { language } = useContext(AppContext);
  const locale = language === 'nl' ? 'nl' : 'en';
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!authService.getAccessToken()) {
      navigate("/login");
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const list = await listDailyChallenges();
      setChallenges(list);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load challenges");
      if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) {
        authService.clearTokens();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!authService.getAccessToken()) {
      navigate("/login");
      return;
    }
    load();
  }, [load, navigate]);

  if (!authService.getAccessToken()) {
    return null;
  }

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          <FormattedMessage id="daily_challenge" defaultMessage="Daily challenge" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.md" py={4}>
          <Text fontSize="sm" color="gray.600" mb={6}>
            <FormattedMessage
              id="daily_challenge_hint"
              defaultMessage="Play a short quiz every day for 7 days. Compete with friends or play solo."
            />
          </Text>

          {error && (
            <Alert.Root status="error" mb={4}>
              <AlertIndicator />
              <Alert.Content>
                <Alert.Title>{error}</Alert.Title>
              </Alert.Content>
            </Alert.Root>
          )}

          <Button
            colorPalette="primary"
            size="lg"
            mb={6}
            onClick={() => navigate("/daily-challenge/new")}
          >
            <FormattedMessage id="new_challenge" defaultMessage="New challenge" />
          </Button>

          <Heading size="md" mb={3}>
            <FormattedMessage id="my_challenges" defaultMessage="My challenges" />
          </Heading>

          {loading && challenges.length === 0 ? (
            <VStack gap={4} py={8}>
              <Spinner size="xl" colorPalette="primary" />
              <Text><FormattedMessage id="loading" defaultMessage="Loading..." /></Text>
            </VStack>
          ) : challenges.length === 0 ? (
            <Text color="gray.500">
              <FormattedMessage
                id="no_challenges_yet"
                defaultMessage="No challenges yet. Start one above."
              />
            </Text>
          ) : (
            <VStack gap={3} align="stretch">
              {challenges.map((c) => (
                <Box
                  key={c.id}
                  p={4}
                  borderWidth="1px"
                  borderRadius="md"
                  bg="gray.50"
                  cursor="pointer"
                  onClick={() => navigate(`/daily-challenge/${c.id}`)}
                  _hover={{ bg: "gray.100" }}
                >
                  <Text fontWeight="600">
                    {c.country ? getCountryDisplayName(c.country, locale) : c.id} · {c.media} · {c.length} questions
                  </Text>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {c.creator_username} · {c.status} · {c.participants?.length ?? 0} players
                  </Text>
                </Box>
              ))}
            </VStack>
          )}
        </Container>
      </Page.Body>
    </Page>
  );
};

export default DailyChallengeListPage;
