import { Box, Button, Flex, Heading, Image, Link, Spinner, Text } from '@chakra-ui/react';
import { useContext, useEffect, useState, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import {
  countryCodeToFlag,
  findInProgressBirdrJourney,
  getStoredBirdrJourneyCountryCode,
  levelTitle,
  type BirdrJourney,
} from '../api/birdrJourney';
import { fetchChecklist } from '../api/checklist';
import { authService } from '../api/services/auth.service';
import { profileService, type UserProfile } from '../api/services/profile.service';
import { BirdrLevelImage } from '../components/birdr-level-image';
import { ProgressRing } from '../components/progress-ring';
import { Feedback } from '../components/feedback';
import { UpdateLine } from '../components/updates/update-line';
import { Loading } from '../components/loading';
import AppContext, { Update } from '../core/app-context';
import { loadUpdates } from '../core/updates';
import { getCountryDisplayName } from '../data/country-names-nl';
import { Page } from '../shared/components/layout';

const APP_STORE_URL = 'https://apps.apple.com/us/app/birdr/id6745144189';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=pro.birdr.app';
const APP_STORE_BADGE = '/images/app-store.png';
const PLAY_STORE_BADGE = '/images/google-play.png';

type ChecklistSummary = {
  countryCode: string;
  countryName: string;
  progress: { identified_count: number; total_count: number; percent: number };
};

const HomePage = () => {
  const { player, loading, language } = useContext(AppContext);
  const locale = language === 'nl' ? 'nl' : 'en';
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [activeJourney, setActiveJourney] = useState<BirdrJourney | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(true);
  const [checklistSummary, setChecklistSummary] = useState<ChecklistSummary | null>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const isAuthenticated = !!authService.getAccessToken();

  const loadActiveJourney = useCallback(async () => {
    setJourneyLoading(true);
    try {
      const storedCountry = getStoredBirdrJourneyCountryCode();
      const journey = await findInProgressBirdrJourney([
        storedCountry,
        profile?.country_code ?? null,
      ]);
      setActiveJourney(journey);
    } catch {
      setActiveJourney(null);
    } finally {
      setJourneyLoading(false);
    }
  }, [profile?.country_code]);

  const loadChecklistSummary = useCallback(async () => {
    if (!isAuthenticated) {
      setChecklistSummary(null);
      return;
    }
    const code = profile?.country_code?.trim();
    if (!code) {
      setChecklistSummary(null);
      return;
    }
    setChecklistLoading(true);
    try {
      const data = await fetchChecklist({
        country_code: code,
        page_size: 1,
        page: 1,
        language: locale,
      });
      setChecklistSummary({
        countryCode: data.country.code,
        countryName: getCountryDisplayName(data.country, locale),
        progress: data.progress,
      });
    } catch {
      setChecklistSummary(null);
    } finally {
      setChecklistLoading(false);
    }
  }, [isAuthenticated, profile?.country_code, locale]);

  useEffect(() => {
    loadUpdates().then(setUpdates).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }
    profileService.getProfile().then(setProfile).catch(() => setProfile(null));
  }, [isAuthenticated]);

  useEffect(() => {
    loadActiveJourney();
    loadChecklistSummary();
  }, [loadActiveJourney, loadChecklistSummary, profile?.country_code]);

  const goJourneyProgress = () => {
    if (!activeJourney?.country?.code) return;
    navigate(`/journey/${activeJourney.country.code}`);
  };

  const countryCode = activeJourney?.country?.code ?? '';
  const countryLabel = activeJourney?.country
    ? getCountryDisplayName(activeJourney.country, locale)
    : '';
  const flag = countryCodeToFlag(countryCode);
  const currentLevelTitle = levelTitle(activeJourney?.current_level, locale);
  const checklistPercent = Math.round(checklistSummary?.progress.percent ?? 0);
  const checklistCountryFlag = countryCodeToFlag(checklistSummary?.countryCode ?? '');

  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          {player ? player.name : <FormattedMessage id="welcome" defaultMessage="Welcome" />}
        </Heading>
      </Page.Header>
      <Page.Body>
        {loading ? (
          <Loading />
        ) : (
          <Flex direction="column" gap={4}>
            <Button onClick={() => navigate('/start')} colorPalette="primary">
              <FormattedMessage id="start game" defaultMessage="Start a new game" />
            </Button>

            {journeyLoading ? (
              <Flex justify="center" py={6}>
                <Spinner size="sm" color="primary.500" />
              </Flex>
            ) : activeJourney ? (
              <Button
                onClick={goJourneyProgress}
                colorPalette="primary"
                height="auto"
                py={4}
                px={4}
                bg="primary.800"
                borderWidth="2px"
                borderColor="primary.400"
              >
                <Flex align="center" gap={4} width="full" textAlign="left">
                  <BirdrLevelImage
                    iconUrl={activeJourney.current_level?.icon_url}
                    variant="current"
                    size={88}
                  />
                  <Flex direction="column" flex={1} minW={0}>
                    <Text fontSize="xl" fontWeight="700" color="primary.50" lineClamp={2}>
                      {currentLevelTitle || (
                        <FormattedMessage id="country_challenge" defaultMessage="Country challenge" />
                      )}
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="primary.100" truncate>
                      {flag ? `${flag} ` : ''}{countryLabel}
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="primary.300">
                      <FormattedMessage id="continue" defaultMessage="Continue" />
                    </Text>
                  </Flex>
                </Flex>
              </Button>
            ) : (
              <Button
                onClick={() => navigate('/journey/intro')}
                colorPalette="primary"
                height="auto"
                py={4}
                px={4}
                bg="primary.800"
                borderWidth="2px"
                borderColor="primary.400"
              >
                <Flex align="center" gap={4} width="full" textAlign="left">
                  <Image
                    src="/images/birdr-success.png"
                    alt=""
                    width="88px"
                    height="88px"
                    objectFit="contain"
                    flexShrink={0}
                  />
                  <Flex direction="column" flex={1} minW={0}>
                    <Text fontSize="xl" fontWeight="700" color="primary.50" lineClamp={2}>
                      <FormattedMessage id="country_challenge" defaultMessage="Country challenge" />
                    </Text>
                    <Text fontSize="sm" fontWeight="600" color="primary.300">
                      <FormattedMessage id="country_challenge_new_improved" defaultMessage="New and improved!" />
                    </Text>
                  </Flex>
                </Flex>
              </Button>
            )}

            {isAuthenticated && (
              checklistLoading && !checklistSummary ? (
                <Flex justify="center" py={6}>
                  <Spinner size="sm" color="primary.500" />
                </Flex>
              ) : (
                <Button
                  onClick={() => navigate('/checklist')}
                  colorPalette="primary"
                  height="auto"
                  py={4}
                  px={4}
                  bg="primary.600"
                  borderWidth="2px"
                  borderColor="primary.400"
                >
                  {checklistSummary ? (
                    <Flex align="center" gap={4} width="full" textAlign="left">
                      <Box position="relative" width="80px" height="80px" flexShrink={0}>
                        <ProgressRing
                          percent={checklistSummary.progress.percent}
                          size={80}
                          stroke={12}
                          trackColor="var(--chakra-colors-primary-500)"
                          progressColor="var(--chakra-colors-primary-100)"
                        />
                        <Flex
                          position="absolute"
                          inset={0}
                          align="center"
                          justify="center"
                          pointerEvents="none"
                        >
                          <Text
                            fontSize="lg"
                            fontWeight="800"
                            color="primary.50"
                            lineHeight="1"
                          >
                            {checklistPercent}%
                          </Text>
                        </Flex>
                      </Box>
                      <Flex direction="column" flex={1} minW={0}>
                        <Text fontSize="xl" fontWeight="700" color="primary.50">
                          <FormattedMessage id="checklist_title" defaultMessage="My Checklist" />
                        </Text>
                        <Text fontSize="sm" fontWeight="600" color="primary.100" truncate>
                          {checklistCountryFlag ? `${checklistCountryFlag} ` : ''}
                          {checklistSummary.countryName}
                        </Text>
                        <Text fontSize="sm" color="primary.200">
                          <FormattedMessage
                            id="checklist_progress"
                            defaultMessage="{identified} / {total} birds identified"
                            values={{
                              identified: checklistSummary.progress.identified_count,
                              total: checklistSummary.progress.total_count,
                            }}
                          />
                        </Text>
                      </Flex>
                    </Flex>
                  ) : (
                    <Flex direction="column" align="flex-start" width="full">
                      <Text fontSize="xl" fontWeight="700" color="primary.50">
                        <FormattedMessage id="checklist_title" defaultMessage="My Checklist" />
                      </Text>
                      <Text fontSize="sm" color="primary.100">
                        {profile?.country_code ? (
                          <FormattedMessage id="error" defaultMessage="Error" />
                        ) : (
                          <FormattedMessage
                            id="checklist_set_country"
                            defaultMessage="Set your preferred country in Profile to use the checklist."
                          />
                        )}
                      </Text>
                    </Flex>
                  )}
                </Button>
              )
            )}

            <Button variant="ghost" colorPalette="primary" onClick={() => navigate('/scores')}>
              <FormattedMessage id="high scores" defaultMessage="High scores" />
            </Button>

            <Flex
              gap={3}
              flexDirection="row"
              justifyContent="space-evenly"
              alignItems="center"
              mt={2}
            >
              <Link
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                display="inline-block"
                aria-label="Download on the App Store"
              >
                <Image
                  src={APP_STORE_BADGE}
                  alt="Download on the App Store"
                  height="48px"
                  style={{ display: 'block' }}
                />
              </Link>
              <Link
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                display="inline-block"
                aria-label="Get it on Google Play"
                flexShrink={0}
              >
                <Image
                  src={PLAY_STORE_BADGE}
                  alt="Get it on Google Play"
                  height="48px"
                  style={{ display: 'block' }}
                />
              </Link>
            </Flex>

            <Feedback />
            {updates && updates.length > 0 && <UpdateLine update={updates[0]} />}
            <Button variant="ghost" colorPalette="primary" onClick={() => navigate('/updates')}>
              <FormattedMessage id="more updates" defaultMessage="More updates" />
            </Button>
          </Flex>
        )}
      </Page.Body>
    </Page>
  );
};

export default HomePage;
