import { Box, Button, Flex, Image, Text, VStack } from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../shared/components/layout';
import { authService } from '../../api/services/auth.service';

export function BirdrJourneyIntroPage() {
  const navigate = useNavigate();
  const isAuthenticated = !!authService.getAccessToken();

  return (
    <Page>
      <Page.Header>
        <FormattedMessage id="country_challenge" defaultMessage="Country challenge" />
      </Page.Header>
      <Page.Body>
        <Box bg="primary.800" borderRadius="xl" p={6} mb={6} textAlign="center">
          <Image
            src="/images/birdr-level0.png"
            alt=""
            width="200px"
            height="200px"
            mx="auto"
            mb={3}
            objectFit="contain"
          />
          <Text fontSize="2xl" fontWeight="700" color="primary.50" mb={2}>
            <FormattedMessage id="birdr_journey_intro_title" defaultMessage="Hatch your birding skills" />
          </Text>
          <Text fontSize="md" color="primary.100" lineHeight="tall">
            <FormattedMessage
              id="birdr_journey_intro_body"
              defaultMessage="Build your country list one step at a time. Play daily quizzes and grow through eight bird stages."
            />
          </Text>
        </Box>

        <VStack align="stretch" gap={3} mb={8}>
          {[1, 2, 3].map((n) => (
            <Flex key={n} align="center" gap={4}>
              <Flex
                width="32px"
                height="32px"
                borderRadius="full"
                bg="primary.500"
                align="center"
                justify="center"
                color="primary.50"
                fontWeight="700"
                flexShrink={0}
              >
                {n}
              </Flex>
              <Text fontSize="md" color="primary.800" lineHeight="short">
                <FormattedMessage
                  id={
                    n === 1
                      ? 'birdr_journey_step_country'
                      : n === 2
                        ? 'birdr_journey_step_daily'
                        : 'birdr_journey_step_hatch'
                  }
                  defaultMessage={
                    n === 1
                      ? 'Choose your country list'
                      : n === 2
                        ? 'Play a quick quiz every day'
                        : 'Advance through eight bird stages'
                  }
                />
              </Text>
            </Flex>
          ))}
        </VStack>

        <Button colorPalette="primary" width="full" mb={3} onClick={() => navigate('/journey/country')}>
          <FormattedMessage id="birdr_journey_select_country" defaultMessage="Choose your country" />
        </Button>

        {!isAuthenticated && (
          <>
            <Button variant="outline" colorPalette="primary" width="full" mb={2} onClick={() => navigate('/journey/country')}>
              <FormattedMessage id="birdr_journey_continue_guest" defaultMessage="Continue as guest" />
            </Button>
            <Button variant="ghost" colorPalette="primary" width="full" onClick={() => navigate('/login')}>
              <FormattedMessage id="sign_up_track_progress" defaultMessage="Sign up to save progress on all your devices" />
            </Button>
          </>
        )}
      </Page.Body>
    </Page>
  );
}
