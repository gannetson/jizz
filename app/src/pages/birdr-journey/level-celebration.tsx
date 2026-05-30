import { Button, Spinner, Text, VStack } from '@chakra-ui/react';
import { useCallback, useContext, useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useNavigate, useParams } from 'react-router-dom';
import {
  advanceJourneyLevel,
  getBirdrJourney,
  levelDescription,
  levelTitle,
  type JourneyLevel,
} from '../../api/birdrJourney';
import { BirdrLevelImage } from '../../components/birdr-level-image';
import AppContext from '../../core/app-context';
import { Page } from '../../shared/components/layout';

export function BirdrJourneyLevelCelebrationPage() {
  const { countryCode = '' } = useParams<{ countryCode: string }>();
  const navigate = useNavigate();
  const { language } = useContext(AppContext);
  const locale = language === 'nl' ? 'nl' : 'en';
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextLevel, setNextLevel] = useState<JourneyLevel | null>(null);
  const [journeyId, setJourneyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const journey = await getBirdrJourney(countryCode);
      setJourneyId(journey?.id ?? null);
      setNextLevel(journey?.next_level ?? null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [countryCode]);

  useEffect(() => {
    load();
  }, [load]);

  const handleContinue = async () => {
    if (!journeyId) return;
    setAdvancing(true);
    setError(null);
    try {
      await advanceJourneyLevel(journeyId);
      navigate(`/journey/${countryCode}`, { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to advance');
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <Page.Body>
          <VStack py={12}>
            <Spinner size="lg" color="primary.500" />
            <Text color="primary.600">
              <FormattedMessage id="loading" defaultMessage="Loading..." />
            </Text>
          </VStack>
        </Page.Body>
      </Page>
    );
  }

  const title = levelTitle(nextLevel, locale);
  const description = levelDescription(nextLevel, locale);

  return (
    <Page>
      <Page.Header>
        <FormattedMessage id="birdr_journey_level_up" defaultMessage="Level up!" />
      </Page.Header>
      <Page.Body>
        <VStack gap={4} align="center" py={4}>
          {nextLevel && (
            <BirdrLevelImage iconUrl={nextLevel.icon_url} variant="current" size={180} />
          )}
          {title && (
            <Text fontSize="xl" fontWeight="700" color="primary.800" textAlign="center">
              {title}
            </Text>
          )}
          {description && (
            <Text fontSize="md" color="primary.700" textAlign="center" lineHeight="tall">
              {description}
            </Text>
          )}
          {error && (
            <Text color="red.500" fontSize="sm">
              {error}
            </Text>
          )}
          <Button colorPalette="primary" width="full" onClick={handleContinue} loading={advancing}>
            <FormattedMessage id="continue" defaultMessage="Continue" />
          </Button>
        </VStack>
      </Page.Body>
    </Page>
  );
}
