import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import AppContext, { type Species } from '../core/app-context';
import { Page } from '../shared/components/layout';
import { SpeciesModal } from '../components/species-modal';
import { SpeciesCoverThumb } from '../components/species-cover-thumb';
import { authService } from '../api/services/auth.service';
import { profileService, type UserProfile } from '../api/services/profile.service';
import {
  fetchTroubleSpots,
  startConfusionPairPractice,
  startSpeciesPractice,
  type TroubleSpotPair,
  type TroubleSpotSpecies,
} from '../api/practice';

const SPECIES_THUMB = '48px';

function speciesModalPayload(row: TroubleSpotSpecies): Species {
  return {
    id: row.species_id,
    code: '',
    name: row.name,
    name_latin: row.name_latin,
    name_nl: '',
    name_translated: row.name,
    tax_order: '',
    tax_family: '',
    tax_family_en: '',
    images: [],
    videos: [],
    sounds: [],
    illustration_url: row.illustration_url ?? undefined,
  };
}

type TabKey = 'species' | 'pairs';

function formatRate(rate: number | null): string {
  if (rate == null) return '—';
  return `${Math.round(rate)}%`;
}

export default function TroubleSpotsPage() {
  const navigate = useNavigate();
  const intl = useIntl();
  const { loadGame, loadPlayer, setGame } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState<TabKey>('species');
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [species, setSpecies] = useState<TroubleSpotSpecies[]>([]);
  const [pairs, setPairs] = useState<TroubleSpotPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingPairKey, setStartingPairKey] = useState<string | null>(null);
  const [startingSpeciesId, setStartingSpeciesId] = useState<number | null>(null);
  const [modalSpecies, setModalSpecies] = useState<Species | undefined>();

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
      await loadPlayer(result.player_token);
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

  const handlePracticeSpecies = async (speciesId: number) => {
    setStartingSpeciesId(speciesId);
    setError(null);
    try {
      const result = await startSpeciesPractice(speciesId, countryCode);
      localStorage.setItem('player-token', result.player_token);
      localStorage.setItem('game-token', result.game.token);
      await loadPlayer(result.player_token);
      const game = await loadGame(result.game.token);
      if (game) {
        setGame(game);
        setModalSpecies(undefined);
        navigate('/game/play');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start practice');
    } finally {
      setStartingSpeciesId(null);
    }
  };

  const speciesTabLabel = intl.formatMessage({
    id: 'trouble_spots_species_title',
    defaultMessage: 'Tricky birds',
  });
  const pairsTabLabel = intl.formatMessage({
    id: 'trouble_spots_pairs_title',
    defaultMessage: 'Confusing pairs',
  });

  const pageTitle = (
    <Heading color="gray.800" size="lg" m={0}>
      <FormattedMessage id="trouble_spots" defaultMessage="My tricky birds" />
    </Heading>
  );

  if (!authenticated) {
    return (
      <Page>
        <Page.Header>{pageTitle}</Page.Header>
        <Page.Body>
          <VStack gap={4} align="stretch">
            <Text color="primary.700">
              <FormattedMessage
                id="trouble_spots_login"
                defaultMessage="Log in to see species you often miss and pairs you confuse."
              />
            </Text>
            <Button alignSelf="flex-start" colorPalette="primary" onClick={() => navigate('/login')}>
              <FormattedMessage id="login" defaultMessage="Login" />
            </Button>
          </VStack>
        </Page.Body>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <Page.Header>{pageTitle}</Page.Header>
        <Page.Body>
          <Flex justify="center" py={12}>
            <Spinner size="lg" colorPalette="primary" />
          </Flex>
        </Page.Body>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>{pageTitle}</Page.Header>
      <Page.Body>
        <VStack gap={6} align="stretch">
          <Flex gap={2} role="tablist">
            {([
              { key: 'species' as const, label: speciesTabLabel, count: species.length },
              { key: 'pairs' as const, label: pairsTabLabel, count: pairs.length },
            ]).map((tab) => (
              <Button
                key={tab.key}
                flex={1}
                role="tab"
                aria-selected={activeTab === tab.key}
                variant={activeTab === tab.key ? 'solid' : 'outline'}
                colorPalette="primary"
                bg={activeTab === tab.key ? 'primary.500' : undefined}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label} ({tab.count})
              </Button>
            ))}
          </Flex>

          {!countryCode && (
            <Text fontSize="sm" color="primary.700">
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

          {activeTab === 'species' ? (
            species.length === 0 ? (
              <Text color="primary.700">
                <FormattedMessage id="trouble_spots_no_species" defaultMessage="No species yet." />
              </Text>
            ) : (
              <VStack gap={0} align="stretch">
                {species.map((row) => {
                  const busy = startingSpeciesId === row.species_id;
                  return (
                    <Flex
                      key={row.species_id}
                      align="center"
                      gap={3}
                      py={2}
                      borderBottomWidth="1px"
                      borderColor="primary.100"
                    >
                      <Box
                        as="button"
                        type="button"
                        flex={1}
                        minW={0}
                        display="flex"
                        alignItems="center"
                        gap={3}
                        textAlign="left"
                        bg="transparent"
                        cursor="pointer"
                        onClick={() => setModalSpecies(speciesModalPayload(row))}
                      >
                        <SpeciesCoverThumb
                          speciesId={row.species_id}
                          initialUrl={row.illustration_url}
                          size={SPECIES_THUMB}
                          alt={row.name}
                        />
                        <Box flex={1} minW={0}>
                          <Text fontWeight="semibold" fontSize="sm" lineClamp={1}>
                            {row.name}
                          </Text>
                          <Text fontSize="xs" color="primary.700" lineClamp={1}>
                            {row.name_latin}
                          </Text>
                          <Text fontSize="xs" color="primary.600" mt={0.5}>
                            <FormattedMessage
                              id="trouble_spots_correct_rate"
                              defaultMessage="{rate} correct"
                              values={{ rate: formatRate(row.correct_rate) }}
                            />
                            {' · '}
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
                      </Box>
                      <Button
                        size="xs"
                        colorPalette="primary"
                        flexShrink={0}
                        loading={busy}
                        disabled={startingSpeciesId != null && !busy}
                        onClick={() => void handlePracticeSpecies(row.species_id)}
                      >
                        <FormattedMessage
                          id="trouble_spots_practice_species"
                          defaultMessage="Practice"
                        />
                      </Button>
                    </Flex>
                  );
                })}
              </VStack>
            )
          ) : pairs.length === 0 ? (
            <Text color="primary.700">
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
                    borderColor="primary.100"
                  >
                    <Text fontWeight="semibold">{pair.low_name} · {pair.high_name}</Text>
                    <Text fontSize="sm" color="primary.700" mb={2}>
                      <FormattedMessage
                        id="trouble_spots_pair_wrong"
                        defaultMessage="{count} mix-ups"
                        values={{ count: pair.total_wrong }}
                      />
                    </Text>
                    <Button
                      size="sm"
                      colorPalette="primary"
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
        </VStack>
      </Page.Body>

      <SpeciesModal
        species={modalSpecies}
        isOpen={!!modalSpecies}
        onClose={() => setModalSpecies(undefined)}
        showPracticeButton
        onPractice={(speciesId) => void handlePracticeSpecies(speciesId)}
        practiceLoading={startingSpeciesId === modalSpecies?.id}
      />
    </Page>
  );
}
