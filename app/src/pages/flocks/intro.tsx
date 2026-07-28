import { Box, Button, Flex, Image, Text, VStack } from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../shared/components/layout';
import { authService } from '../../api/services/auth.service';

export function FlocksIntroPage() {
  const navigate = useNavigate();
  const isAuthenticated = !!authService.getAccessToken();

  const goCreate = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/flocks/intro' } });
      return;
    }
    navigate('/flocks?create=1');
  };

  return (
    <Page>
      <Page.Header>
        <FormattedMessage id="flocks_start" defaultMessage="Start flock" />
      </Page.Header>
      <Page.Body>
        <Box bg="primary.800" borderRadius="xl" p={6} mb={6} textAlign="center">
          <Image
            src="/images/birdr-flock-invite.png"
            alt=""
            maxW="100%"
            w="320px"
            mx="auto"
            mb={4}
            objectFit="contain"
          />
          <Text fontSize="2xl" fontWeight="700" color="primary.50" mb={2}>
            <FormattedMessage
              id="flocks_intro_title"
              defaultMessage="Play bird ID with your friends"
            />
          </Text>
          <Text fontSize="md" color="primary.100" lineHeight="tall">
            <FormattedMessage
              id="flocks_intro_body"
              defaultMessage="A flock is your private birding club. Invite friends, start a weekly challenge, and see who really knows their birds — it’s more fun together."
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
                      ? 'flocks_intro_step_create'
                      : n === 2
                        ? 'flocks_intro_step_invite'
                        : 'flocks_intro_step_compete'
                  }
                  defaultMessage={
                    n === 1
                      ? 'Create a flock for your club or group of friends'
                      : n === 2
                        ? 'Invite members with a link or code'
                        : 'Compete in the same weekly 20-bird challenge'
                  }
                />
              </Text>
            </Flex>
          ))}
        </VStack>

        <Button colorPalette="primary" width="full" mb={3} onClick={goCreate}>
          <FormattedMessage id="flocks_intro_cta" defaultMessage="Create your flock" />
        </Button>

        <Button
          variant="ghost"
          colorPalette="primary"
          width="full"
          onClick={() => navigate('/flocks?create=1')}
        >
          <FormattedMessage id="flocks_intro_join_instead" defaultMessage="I already have an invite" />
        </Button>
      </Page.Body>
    </Page>
  );
}

export default FlocksIntroPage;
