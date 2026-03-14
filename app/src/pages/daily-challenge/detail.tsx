import React, { useState, useEffect, useCallback } from "react";
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
  HStack,
  Badge,
} from "@chakra-ui/react";
import { FormattedMessage } from "react-intl";
import { useNavigate, useParams } from "react-router-dom";
import {
  getDailyChallenge,
  getDailyChallengeRound,
  type DailyChallenge,
  type DailyChallengeRound,
} from "../../api/services/daily-challenge.service";
import { authService } from "../../api/services/auth.service";
import { Page } from "../../shared/components/layout";
import AppContext from "../../core/app-context";
import { useContext } from "react";
import { format } from "date-fns";
import { getCountryDisplayName } from "../../data/country-names-nl";

export const DailyChallengeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useContext(AppContext);
  const locale = language === 'nl' ? 'nl' : 'en';
  const navigate = useNavigate();
  const { loadGame, setPlayer, loadPlayer } = useContext(AppContext);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !authService.getAccessToken()) {
      if (!authService.getAccessToken()) navigate("/login");
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const c = await getDailyChallenge(parseInt(id, 10));
      setChallenge(c);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load challenge");
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlayRound = async (round: DailyChallengeRound) => {
    if (!round.game_token || !id) return;
    setPlaying(true);
    setError(null);
    try {
      const roundData = await getDailyChallengeRound(parseInt(id, 10), round.day_number);
      const gameToken = roundData.game_token ?? (roundData as any).game_token;
      const myPlayerToken = roundData.my_player_token ?? (roundData as any).my_player_token;
      if (!gameToken) {
        setError("Could not load game");
        return;
      }
      localStorage.setItem("game-token", gameToken);
      const game = await loadGame(gameToken);
      if (game && myPlayerToken) {
        await loadPlayer(myPlayerToken);
      }
      if (game) {
        navigate("/game/lobby", { state: { fromDailyChallengeId: id } });
      } else {
        setError("Could not load game");
      }
    } catch {
      setError("Could not load game");
    } finally {
      setPlaying(false);
    }
  };

  const handleOpenRoundReview = (gameToken: string) => {
    navigate(`/my-games/${gameToken}`);
  };

  if (!id) {
    return (
      <Page>
        <Page.Body>
          <Text color="gray.500"><FormattedMessage id="no_challenge_selected" defaultMessage="No challenge selected" /></Text>
        </Page.Body>
      </Page>
    );
  }

  if (loading && !challenge) {
    return (
      <Page>
        <Page.Header>
          <Heading color="gray.800" size="lg" m={0}>
            <FormattedMessage id="daily_challenge" defaultMessage="Daily challenge" />
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

  if (error && !challenge) {
    return (
      <Page>
        <Page.Header>
          <Heading color="gray.800" size="lg" m={0}>
            <FormattedMessage id="daily_challenge" defaultMessage="Daily challenge" />
          </Heading>
        </Page.Header>
        <Page.Body>
          <Alert.Root status="error">
            <AlertIndicator />
            <Alert.Content>
              <Alert.Title>{error}</Alert.Title>
            </Alert.Content>
          </Alert.Root>
        </Page.Body>
      </Page>
    );
  }

  if (!challenge) return null;

  const rounds = challenge.rounds ?? [];

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          {challenge.country ? getCountryDisplayName(challenge.country, locale) : "Challenge"} · {challenge.duration_days} days
        </Heading>
        <Text fontSize="sm" color="gray.600" mt={1}>
          {challenge.creator_username} · {challenge.media} · {challenge.length} questions · {challenge.status}
        </Text>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.md" py={4}>
          {error && (
            <Alert.Root status="error" mb={4}>
              <AlertIndicator />
              <Alert.Content>
                <Alert.Title>{error}</Alert.Title>
              </Alert.Content>
            </Alert.Root>
          )}

          <Heading size="md" mb={3}>
            <FormattedMessage id="rounds" defaultMessage="Rounds" />
          </Heading>

          <VStack gap={3} align="stretch">
            {rounds.map((r: DailyChallengeRound) => {
              const isCompleted = Boolean(r.game_ended && r.user_score != null);
              const isPlayable = r.status === "active" && r.game_token && !isCompleted;
              const isReviewable = isCompleted && r.game_token;
              const multiplier = r.points_multiplier ?? (r.day_number === 3 ? 2 : r.day_number === 7 ? 3 : 1);
              const showMultiplier = multiplier > 1;
              const scoreToShow = r.display_score ?? r.user_score;
              const closesAt = r.closes_at_local
                ? format(new Date(r.closes_at_local), "PPp")
                : r.closes_at
                  ? format(new Date(r.closes_at), "PPp")
                  : "";

              return (
                <Box
                  key={r.id}
                  p={4}
                  borderWidth="2px"
                  borderRadius="md"
                  borderColor={isCompleted ? "green.300" : isPlayable ? "primary.400" : "gray.200"}
                  bg={isCompleted ? "green.50" : "gray.50"}
                  cursor={isReviewable ? "pointer" : undefined}
                  onClick={isReviewable ? () => handleOpenRoundReview(r.game_token!) : undefined}
                  _hover={isReviewable ? { bg: "green.100" } : undefined}
                >
                  <HStack justify="space-between" align="center" mb={2}>
                    <HStack gap={2}>
                      <Text fontWeight="600">
                        <FormattedMessage id="day" defaultMessage="Day" /> {r.day_number}
                      </Text>
                      {showMultiplier && (
                        <Badge colorPalette="primary" size="sm">
                          {multiplier === 2 ? "2× points!" : "3× points!!"}
                        </Badge>
                      )}
                    </HStack>
                    {scoreToShow != null && (
                      <Text fontWeight="600" color="primary.600">
                        {scoreToShow} pts
                      </Text>
                    )}
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    {r.status} · <FormattedMessage id="closes" defaultMessage="closes" /> {closesAt}
                  </Text>
                  {isPlayable && (
                    <Button
                      colorPalette="primary"
                      size="sm"
                      mt={3}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayRound(r);
                      }}
                      disabled={playing}
                      loading={playing}
                    >
                      {showMultiplier ? (
                        <FormattedMessage id="play_multiplier" defaultMessage="Play · {multiplier}× points!" values={{ multiplier }} />
                      ) : (
                        <FormattedMessage id="play" defaultMessage="Play" />
                      )}
                    </Button>
                  )}
                  {isReviewable && (
                    <Text fontSize="xs" color="gray.500" mt={2}>
                      <FormattedMessage id="tap_to_view_answers" defaultMessage="Tap to view right and wrong answers" />
                    </Text>
                  )}
                </Box>
              );
            })}
          </VStack>

          {challenge.rounds?.some((r: DailyChallengeRound) => r.status === "active" && !r.game_token) && (
            <Text fontSize="sm" color="gray.500" mt={4}>
              <FormattedMessage id="todays_round_not_ready" defaultMessage="Today's round is not ready yet." />
            </Text>
          )}
        </Container>
      </Page.Body>
    </Page>
  );
};

export default DailyChallengeDetailPage;
