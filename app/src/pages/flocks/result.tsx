import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertContent,
  AlertIndicator,
  AlertTitle,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Image,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import {
  buildFlockResultWebUrl,
  formatFlockResultShareMessage,
  getFlockDetailPath,
  getFlockInvitePath,
  getFlockLeaderboardPath,
  getPublicFlockResult,
  type PublicFlockResult,
} from '../../api/flocks';
import { authService } from '../../api/services/auth.service';
import { FlockShareBlock } from '../../components/flocks/share-block';
import { BirdrArtImage } from '../../components/birdr-art-image';
import { Page } from '../../shared/components/layout';
import AppStoreBanner from '../../components/app-store-banner';

export function FlockResultPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<PublicFlockResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setLoading(true);
      setResult(await getPublicFlockResult(token));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Page>
        <Page.Body>
          <Flex justify="center" py={12}>
            <Spinner size="lg" color="primary.500" />
          </Flex>
        </Page.Body>
      </Page>
    );
  }

  if (!result) {
    return (
      <Page>
        <Page.Body>
          <Container maxW="container.md" py={4}>
            <Alert.Root status="error">
              <AlertIndicator />
              <AlertContent>
                <AlertTitle>
                  {error === 'not_found' ? (
                    <FormattedMessage
                      id="flocks_result_not_found"
                      defaultMessage="Result not found."
                    />
                  ) : (
                    error ?? 'Failed to load result'
                  )}
                </AlertTitle>
              </AlertContent>
            </Alert.Root>
          </Container>
        </Page.Body>
      </Page>
    );
  }

  const shareUrl =
    typeof window !== 'undefined'
      ? buildFlockResultWebUrl(token, window.location.origin)
      : buildFlockResultWebUrl(token);
  const shareMessage = formatFlockResultShareMessage(
    result.correct_count,
    result.length,
    result.flock_name,
    shareUrl,
    result.rank_label
  );
  const isLoggedIn = !!authService.getAccessToken();
  const canInvite = isLoggedIn && !!result.flock_slug;

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          <FormattedMessage id="flocks_result_title" defaultMessage="Challenge result" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.md" py={4}>
          <VStack align="stretch" gap={6}>
            <Box borderWidth="1px" borderRadius="lg" p={6} bg="white" textAlign="center">
              <BirdrArtImage
                filename="birdr-leaderboard.png"
                alt=""
                maxW="220px"
                mx="auto"
                mb={4}
                objectFit="contain"
              />
              {result.logo_url ? (
                <Image
                  src={result.logo_url}
                  alt=""
                  boxSize="72px"
                  borderRadius="md"
                  objectFit="cover"
                  mx="auto"
                  mb={4}
                />
              ) : null}
              <Heading size="md" mb={2}>
                {result.flock_name}
              </Heading>
              <Text fontSize="sm" color="gray.600" mb={4}>
                {result.challenge_title}
              </Text>
              <Text fontSize="2xl" fontWeight="800" color="primary.600">
                {result.score_label}
              </Text>
              <Text fontSize="lg" fontWeight="600" mt={2}>
                {result.display_name}
              </Text>
              {result.rank_label && result.is_ranked ? (
                <Text fontSize="md" color="gray.700" mt={2}>
                  {result.rank_label}
                </Text>
              ) : !result.is_ranked ? (
                <Text fontSize="sm" color="gray.500" mt={2}>
                  <FormattedMessage id="flocks_practice_run" defaultMessage="Practice run" />
                </Text>
              ) : null}
            </Box>

            <FlockShareBlock
              titleId="flocks_result_share"
              titleDefault="Share result"
              shareUrl={shareUrl}
              shareMessage={shareMessage}
              hintId="flocks_result_share_hint"
              hintDefault="Challenge friends to beat your score."
            />

            <Flex direction="column" gap={3}>
              {canInvite ? (
                <Button
                  colorPalette="primary"
                  onClick={() => navigate(getFlockInvitePath(result.flock_slug))}
                >
                  <FormattedMessage
                    id="flocks_invite_more"
                    defaultMessage="Invite more members"
                  />
                </Button>
              ) : null}
              {result.flock_slug && result.challenge_id ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    navigate(getFlockLeaderboardPath(result.flock_slug, result.challenge_id))
                  }
                >
                  <FormattedMessage id="flocks_view_leaderboard" defaultMessage="View leaderboard" />
                </Button>
              ) : null}
              {result.flock_slug ? (
                <Button
                  variant="ghost"
                  onClick={() => navigate(getFlockDetailPath(result.flock_slug))}
                >
                  <FormattedMessage id="back_to_flock" defaultMessage="Back to flock" />
                </Button>
              ) : null}
            </Flex>

            <AppStoreBanner />
          </VStack>
        </Container>
      </Page.Body>
    </Page>
  );
}

export default FlockResultPage;
