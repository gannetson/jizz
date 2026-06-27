import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import AppContext from '../core/app-context';
import { Page } from '../shared/components/layout';
import { authService } from '../api/services/auth.service';
import { profileService, type UserProfile } from '../api/services/profile.service';
import { services } from '../api/services';
import {
  fetchTroubleSpots,
  startConfusionPairPractice,
  type TroubleSpotPair,
  type TroubleSpotSpecies,
} from '../api/practice';

function formatRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate)}%`;
}

export default function TroubleSpotsPage() {
  const navigate = useNavigate();
  const { loadGame, setGame, setPlayer } = useContext(AppContext);
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [species, setSpecies] = useState<TroubleSpotSpecies[]>([]);
  const [pairs, setPairs] = useState<TroubleSpotPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingPairKey, setStartingPairKey] = useState<string | null>(null);

  const countryCode = profile?.country_code?.trim()?.toUpperCase();

  const checkAuth = useCallback(async () => {
    const ok = await authService.ensureValidAccessToken();
    setAuthenticated(!!ok && !!authService.getAccessToken());
    if (ok && authService.getAccessToken()) {
      try {
        setProfile(await profileService.getProfile());
      } catch {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  }, []);

  const load = useCallback(async () => {
    if (!authenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTroubleSpots(countryCode);
      setSpecies(data.species);
      setPairs(data.pairs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setSpecies([]);
      setPairs([]);
    } finally {
      setLoading(false);
    }
  }, [authenticated, countryCode]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePracticePair = async (pair: TroubleSpotPair) => {
    const key = `${pair.low_id}-${pair.high_id}`;
    setStartingPairKey(key);
    setError(null);
    try {
      const result = await startConfusionPairPractice(pair.low_id, pair.high_id, countryCode);
      localStorage.setItem('player-token', result.player_token);
      localStorage.setItem('game-token', result.game.token);
      const player = await services.player.loadPlayer(result.player_token);
      setPlayer(player);
      const game = await loadGame(result.game.token);
      if (game) {
        setGame(game);
        navigate('/game/play');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start practice');
    } finally {
      setStartingPairKey(null);
    }
  };

  if (!authenticated) {
    return (
      <Page>
        <VStack gap={4} align="stretch" maxW="640px">
          <Heading size="lg">
            <FormattedMessage id="trouble_spots" defaultMessage="My tricky birds" />
          </Heading>
          <Text color="gray.600">
            <FormattedMessage
              id="trouble_spots_login"
              defaultMessage="Log in to see species you often miss and pairs you confuse."
            />
          </Text>
          <Button alignSelf="flex-start" onClick={() => navigate('/login')}>
            <FormattedMessage id="login" defaultMessage="Login" />
          </Button>
        </VStack>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <Box py={12} textAlign="center">
          <Spinner size="lg" />
        </Box>
      </Page>
    );
  }

  const empty = species.length === 0 && pairs.length === 0;

  return (
    <Page>
      <VStack gap={6} align="stretch" maxW="720px">
        <Heading size="lg">
          <FormattedMessage id="trouble_spots" defaultMessage="My tricky birds" />
        </Heading>
        {!countryCode && (
          <Text fontSize="sm" color="gray.600">
            <FormattedMessage
              id="trouble_spots_set_country"
              defaultMessage="Set your country in profile to filter by your checklist."
            />
          </Text>
        )}
        {error ? (
          <Text color="red.600" fontSize="sm">
            {error}
          </Text>
        ) : null}
        {empty ? (
          <Text color="gray.600">
            <FormattedMessage
              id="trouble_spots_empty"
              defaultMessage="Play more quizzes to build your trouble list."
            />
          </Text>
        ) : (
          <>
            <Box>
              <Heading size="md" mb={3}>
                <FormattedMessage
                  id="trouble_spots_species_title"
                  defaultMessage="Species you miss"
                />
              </Heading>
              {species.length === 0 ? (
                <Text fontSize="sm" color="gray.600">
                  <FormattedMessage id="trouble_spots_no_species" defaultMessage="No species yet." />
                </Text>
              ) : (
                <VStack gap={0} align="stretch">
                  {species.map((row) => (
                    <Box
                      key={row.species_id}
                      py={3}
                      borderBottomWidth="1px"
                      borderColor="gray.100"
                      display="flex"
                      justifyContent="space-between"
                      gap={4}
                    >
                      <Box>
                        <Text fontWeight="semibold">{row.name}</Text>
                        <Text fontSize="sm" color="gray.600">
                          {row.name_latin}
                        </Text>
                      </Box>
                      <Text fontSize="sm" color="gray.700" whiteSpace="nowrap">
                        <FormattedMessage
                          id="trouble_spots_wrong_rate"
                          defaultMessage="{wrong}/{shown} · {rate} wrong"
                          values={{
                            wrong: row.wrongly_answered,
                            shown: row.times_shown,
                            rate: formatRate(row.error_rate),
                          }}
                        />
                      </Text>
                    </Box>
                  ))}
                </VStack>
              )}
            </Box>

            <Box>
              <Heading size="md" mb={3}>
                <FormattedMessage
                  id="trouble_spots_pairs_title"
                  defaultMessage="Confusing pairs"
                />
              </Heading>
              {pairs.length === 0 ? (
                <Text fontSize="sm" color="gray.600">
                  <FormattedMessage id="trouble_spots_no_pairs" defaultMessage="No pairs yet." />
                </Text>
              ) : (
                <VStack gap={3} align="stretch">
                  {pairs.map((pair) => {
                    const key = `${pair.low_id}-${pair.high_id}`;
                    const busy = startingPairKey === key;
                    return (
                      <Box
                        key={key}
                        py={3}
                        borderBottomWidth="1px"
                        borderColor="gray.100"
                      >
                        <Text fontWeight="semibold">
                          {pair.low_name} · {pair.high_name}
                        </Text>
                        <Text fontSize="sm" color="gray.600" mb={2}>
                          <FormattedMessage
                            id="trouble_spots_pair_wrong"
                            defaultMessage="{count} mix-ups"
                            values={{ count: pair.total_wrong }}
                          />
                        </Text>
                        <Button
                          size="sm"
                          colorPalette="green"
                          loading={busy}
                          disabled={startingPairKey != null && !busy}
                          onClick={() => void handlePracticePair(pair)}
                        >
                          <FormattedMessage
                            id="trouble_spots_practice_pair"
                            defaultMessage="Practice this pair"
                          />
                        </Button>
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </Box>
          </>
        )}
      </VStack>
    </Page>
  );
}
