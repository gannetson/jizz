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
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import {
  buildFlockChallengeShareUrl,
  formatFlockLeaderboardShareMessage,
  getFlock,
  getFlockDetailPath,
  getFlockLeaderboard,
  getFlockResultPath,
  type Flock,
  type LeaderboardEntry,
  type LeaderboardPayload,
} from '../../api/flocks';
import { authService } from '../../api/services/auth.service';
import { Page } from '../../shared/components/layout';

function LeaderboardTable({
  entries,
  highlightUserId,
  onViewResult,
}: {
  entries: LeaderboardEntry[];
  highlightUserId?: number | null;
  onViewResult?: (token: string) => void;
}) {
  if (!entries.length) {
    return (
      <Text fontSize="sm" color="gray.600">
        <FormattedMessage id="flocks_leaderboard_empty" defaultMessage="No scores yet." />
      </Text>
    );
  }

  return (
    <Box overflowX="auto">
      <TableRoot size="sm" variant="outline">
        <TableHeader>
          <TableRow>
            <TableColumnHeader>#</TableColumnHeader>
            <TableColumnHeader>
              <FormattedMessage id="player" defaultMessage="Player" />
            </TableColumnHeader>
            <TableColumnHeader>
              <FormattedMessage id="flocks_score" defaultMessage="Score" />
            </TableColumnHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow
              key={`${entry.rank}-${entry.user_id}`}
              bg={highlightUserId === entry.user_id ? 'primary.50' : undefined}
              cursor={onViewResult && entry.result_token ? 'pointer' : undefined}
              onClick={() => {
                if (onViewResult && entry.result_token) onViewResult(entry.result_token);
              }}
            >
              <TableCell>{entry.rank}</TableCell>
              <TableCell fontWeight="600">{entry.display_name}</TableCell>
              <TableCell>{entry.score_label}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableRoot>
    </Box>
  );
}

export function FlockLeaderboardPage() {
  const { slug = '', challengeId: challengeIdParam } = useParams<{
    slug: string;
    challengeId: string;
  }>();
  const challengeId = Number(challengeIdParam);
  const navigate = useNavigate();
  const [flock, setFlock] = useState<Flock | null>(null);
  const [board, setBoard] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slug || !challengeId || !authService.getAccessToken()) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const [flockData, leaderboard] = await Promise.all([
        getFlock(slug),
        getFlockLeaderboard(slug, challengeId),
      ]);
      setFlock(flockData);
      setBoard(leaderboard);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setBoard(null);
    } finally {
      setLoading(false);
    }
  }, [slug, challengeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const challenge =
    flock?.active_challenge?.id === challengeId ? flock.active_challenge : null;
  const meUserId = board?.me?.user_id ?? null;

  const handleShareLeaderboard = async () => {
    if (!flock || !challenge?.public_token) return;
    const shareUrl =
      challenge.share_url || buildFlockChallengeShareUrl(challenge.public_token);
    const shareMessage = formatFlockLeaderboardShareMessage(
      flock.name,
      challenge.title,
      shareUrl
    );
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: flock.name, text: shareMessage, url: shareUrl });
        return;
      }
    } catch {
      // fall through
    }
    try {
      await navigator.clipboard.writeText(shareMessage);
    } catch {
      // ignore
    }
  };

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          <FormattedMessage id="flocks_leaderboard" defaultMessage="Leaderboard" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.md" py={4}>
          {flock ? (
            <Text fontSize="sm" color="gray.600" mb={1}>
              {flock.name}
            </Text>
          ) : null}
          {challenge ? (
            <Text fontWeight="600" mb={4}>
              {challenge.title}
            </Text>
          ) : null}

          {error ? (
            <Alert.Root status="error" mb={4}>
              <AlertIndicator />
              <AlertContent>
                <AlertTitle>{error}</AlertTitle>
              </AlertContent>
            </Alert.Root>
          ) : null}

          {loading ? (
            <Flex justify="center" py={8}>
              <Spinner size="sm" color="primary.500" />
            </Flex>
          ) : (
            <>
              <Image
                src="/images/birdr-leaderboard.png"
                alt=""
                maxW="220px"
                mx="auto"
                mb={6}
                objectFit="contain"
              />
              {board ? (
                <VStack align="stretch" gap={4} mb={6}>
                  <LeaderboardTable
                    entries={board.top}
                    highlightUserId={meUserId}
                    onViewResult={(token) => navigate(getFlockResultPath(token))}
                  />
                  {board.me && board.me.rank > 10 ? (
                    <>
                      <Text fontSize="sm" color="gray.500" textAlign="center">
                        …
                      </Text>
                      <LeaderboardTable
                        entries={board.neighbours.length ? board.neighbours : [board.me]}
                        highlightUserId={meUserId}
                        onViewResult={(token) => navigate(getFlockResultPath(token))}
                      />
                    </>
                  ) : null}
                </VStack>
              ) : null}
            </>
          )}

          <Flex gap={3} flexWrap="wrap">
            {challenge?.public_token ? (
              <Button variant="outline" colorPalette="primary" onClick={() => void handleShareLeaderboard()}>
                <FormattedMessage
                  id="flocks_share_leaderboard"
                  defaultMessage="Share leaderboard"
                />
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => navigate(getFlockDetailPath(slug))}>
              <FormattedMessage id="back_to_flock" defaultMessage="Back to flock" />
            </Button>
          </Flex>
        </Container>
      </Page.Body>
    </Page>
  );
}

export default FlockLeaderboardPage;
