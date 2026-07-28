import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertContent,
  AlertIndicator,
  AlertTitle,
  Box,
  Button,
  Container,
  Field,
  Flex,
  Heading,
  Image,
  Input,
  Spinner,
  Switch,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createFlock,
  getFlockDetailPath,
  getFlocksIntroPath,
  joinFlock,
  listFlocks,
  setStoredMainFlockSlug,
  type Flock,
} from '../../api/flocks';
import { authService } from '../../api/services/auth.service';
import CountryCombobox from '../../components/country-combobox';
import { Page } from '../../shared/components/layout';
import { getCountryDisplayName } from '../../data/country-names-nl';
import { UseCountries, type Country } from '../../user/use-countries';
import AppContext from '../../core/app-context';
import { useContext } from 'react';

export function FlocksListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const intl = useIntl();
  const { language } = useContext(AppContext);
  const locale = language === 'nl' ? 'nl' : 'en';
  const { countries } = UseCountries();
  const countriesList = Array.isArray(countries) ? countries : [];

  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!authService.getAccessToken());
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(() => searchParams.get('create') === '1');
  const [name, setName] = useState('');
  const [country, setCountry] = useState<Country | null>(null);
  const [isPrivate, setIsPrivate] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const syncAuth = () => setIsAuthenticated(!!authService.getAccessToken());
    syncAuth();
    window.addEventListener('focus', syncAuth);
    const interval = setInterval(syncAuth, 3000);
    return () => {
      window.removeEventListener('focus', syncAuth);
      clearInterval(interval);
    };
  }, []);

  const load = useCallback(async () => {
    if (!authService.getAccessToken()) {
      setFlocks([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setLoading(true);
      setFlocks(await listFlocks());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setFlocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, isAuthenticated]);

  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setShowCreate(true);
    }
  }, [searchParams]);

  const handleCreate = async () => {
    if (!name.trim() || !country?.code) return;
    setCreating(true);
    setError(null);
    try {
      const flock = await createFlock({
        name: name.trim(),
        country_code: country.code,
        is_private: isPrivate,
      });
      setShowCreate(false);
      setName('');
      setStoredMainFlockSlug(flock.slug);
      if (searchParams.get('create') === '1') {
        setSearchParams({}, { replace: true });
      }
      navigate(getFlockDetailPath(flock.slug));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create flock');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    setError(null);
    try {
      const result = await joinFlock({ code });
      setJoinCode('');
      setStoredMainFlockSlug(result.flock.slug);
      navigate(getFlockDetailPath(result.flock.slug));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const hasFlocks = flocks.length > 0;

  if (!isAuthenticated) {
    return (
      <Page>
        <Page.Header>
          <Heading color="gray.800" size="lg" m={0}>
            <FormattedMessage id="flocks_title" defaultMessage="Flocks" />
          </Heading>
        </Page.Header>
        <Page.Body>
          <Container maxW="container.md" py={4}>
            <Text color="primary.700" mb={4}>
              <FormattedMessage
                id="flocks_login_required"
                defaultMessage="Log in to view your flocks or create a new one."
              />
            </Text>
            <Button colorPalette="primary" onClick={() => navigate('/login')}>
              <FormattedMessage id="login" defaultMessage="Login" />
            </Button>
          </Container>
        </Page.Body>
      </Page>
    );
  }

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          <FormattedMessage id="flocks_title" defaultMessage="Flocks" />
        </Heading>
      </Page.Header>
      <Page.Body>
        <Container maxW="container.md" py={4}>
          {error && (
            <Alert.Root status="error" mb={4}>
              <AlertIndicator />
              <AlertContent>
                <AlertTitle>{error}</AlertTitle>
              </AlertContent>
            </Alert.Root>
          )}

          {loading && flocks.length === 0 ? (
            <Flex justify="center" py={8}>
              <Spinner size="sm" color="primary.500" />
            </Flex>
          ) : null}

          {hasFlocks ? (
            <>
              <Heading size="md" mb={3}>
                <FormattedMessage id="flocks_my_flocks" defaultMessage="My flocks" />
              </Heading>
              <VStack align="stretch" gap={3} mb={6}>
                {flocks.map((flock) => {
                  const countryName = getCountryDisplayName(flock.default_country, locale);
                  const challenge = flock.active_challenge;
                  return (
                    <Box
                      key={flock.id}
                      borderWidth="1px"
                      borderColor="gray.200"
                      borderRadius="lg"
                      overflow="hidden"
                      bg="white"
                      cursor="pointer"
                      onClick={() => {
                        setStoredMainFlockSlug(flock.slug);
                        navigate(getFlockDetailPath(flock.slug));
                      }}
                      _hover={{ bg: 'gray.50' }}
                    >
                      <Flex align="center" gap={4} p={4}>
                        {flock.logo_url ? (
                          <Image
                            src={flock.logo_url}
                            alt=""
                            boxSize="56px"
                            borderRadius="md"
                            objectFit="cover"
                          />
                        ) : (
                          <Image
                            src="/images/birdr-leaderboard.png"
                            alt=""
                            boxSize="56px"
                            objectFit="contain"
                          />
                        )}
                        <Box flex={1} minW={0}>
                          <Text fontWeight="700" fontSize="lg" truncate>
                            {flock.name}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {countryName} ·{' '}
                            <FormattedMessage
                              id="flocks_member_count"
                              defaultMessage="{count} members"
                              values={{ count: flock.member_count }}
                            />
                          </Text>
                          {challenge ? (
                            <Text fontSize="sm" color="primary.600" mt={1}>
                              {challenge.title} · {challenge.participant_count}{' '}
                              <FormattedMessage id="flocks_players" defaultMessage="players" />
                            </Text>
                          ) : (
                            <Text fontSize="sm" color="gray.500" mt={1}>
                              <FormattedMessage
                                id="flocks_no_active_challenge"
                                defaultMessage="No active challenge"
                              />
                            </Text>
                          )}
                        </Box>
                        <Text fontSize="sm" fontWeight="600" color="primary.500">
                          <FormattedMessage id="continue" defaultMessage="Continue" />
                        </Text>
                      </Flex>
                    </Box>
                  );
                })}
              </VStack>

              {!showCreate ? (
                <Flex direction="column" align="center" gap={2} mt={2}>
                  <Button
                    variant="ghost"
                    size="sm"
                    colorPalette="primary"
                    onClick={() => navigate(getFlocksIntroPath())}
                  >
                    <FormattedMessage id="flocks_start_another" defaultMessage="Start another flock" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    colorPalette="primary"
                    onClick={() => setShowCreate(true)}
                  >
                    <FormattedMessage id="flocks_join_subtle" defaultMessage="Join with invite code" />
                  </Button>
                </Flex>
              ) : null}
            </>
          ) : !loading ? (
            <>
              <Image
                src="/images/birdr-flock-invite.png"
                alt=""
                maxW="240px"
                mx="auto"
                mb={4}
                objectFit="contain"
                display="block"
              />
              <Text fontSize="sm" color="gray.600" mb={6} textAlign="center">
                <FormattedMessage
                  id="flocks_overview_hint"
                  defaultMessage="Join a club or create your own. Play weekly bird ID challenges and compare scores with members — right in the browser."
                />
              </Text>
              <Button
                colorPalette="primary"
                size="lg"
                mb={4}
                width="full"
                onClick={() => navigate(getFlocksIntroPath())}
              >
                <FormattedMessage id="flocks_start" defaultMessage="Start flock" />
              </Button>
            </>
          ) : null}

          {showCreate && (
            <Box borderWidth="1px" borderRadius="lg" p={4} mb={6} mt={hasFlocks ? 4 : 0} bg="white">
              <Text fontWeight="600" mb={3}>
                <FormattedMessage id="flocks_join_with_code" defaultMessage="Join with invite code" />
              </Text>
              <Flex gap={2} flexWrap="wrap" mb={6}>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder={intl.formatMessage({
                    id: 'flocks_join_code_placeholder',
                    defaultMessage: 'e.g. AB12CD',
                  })}
                  maxLength={12}
                  flex="1"
                  minW="140px"
                  fontFamily="mono"
                  letterSpacing="0.08em"
                />
                <Button
                  colorPalette="primary"
                  loading={joining}
                  disabled={joinCode.trim().length < 4}
                  onClick={() => void handleJoinByCode()}
                >
                  <FormattedMessage id="flocks_join" defaultMessage="Join flock" />
                </Button>
              </Flex>

              <Text fontWeight="600" mb={3}>
                <FormattedMessage id="flocks_create" defaultMessage="Create flock" />
              </Text>
              <VStack align="stretch" gap={4}>
                <Field.Root required>
                  <Field.Label>
                    <FormattedMessage id="flocks_name" defaultMessage="Flock name" />
                  </Field.Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </Field.Root>
                <Box>
                  <Text mb={2} fontSize="sm" fontWeight="600">
                    <FormattedMessage id="country" defaultMessage="Country" />
                  </Text>
                  <CountryCombobox
                    countries={countriesList}
                    value={country}
                    onChange={setCountry}
                    excludeRegionCodes
                    placeholder={intl.formatMessage({
                      id: 'flocks_select_country',
                      defaultMessage: 'Default quiz country',
                    })}
                  />
                </Box>
                <Flex align="center" gap={3}>
                  <Switch.Root
                    checked={isPrivate}
                    onCheckedChange={(e: { checked: boolean }) => setIsPrivate(!!e.checked)}
                  >
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                  <Text fontSize="sm">
                    <FormattedMessage id="flocks_private" defaultMessage="Private flock" />
                  </Text>
                </Flex>
                <Button
                  colorPalette="primary"
                  loading={creating}
                  disabled={!name.trim() || !country?.code}
                  onClick={() => void handleCreate()}
                >
                  <FormattedMessage id="flocks_create_submit" defaultMessage="Create" />
                </Button>
                {hasFlocks ? (
                  <Button variant="ghost" onClick={() => setShowCreate(false)}>
                    <FormattedMessage id="close" defaultMessage="Close" />
                  </Button>
                ) : null}
              </VStack>
            </Box>
          )}
        </Container>
      </Page.Body>
    </Page>
  );
}

export default FlocksListPage;
