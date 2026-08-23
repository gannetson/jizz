import { ReactNode } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { Page } from '../shared/components/layout';

type Props = {
  title: ReactNode;
  description: ReactNode;
  thumbs?: ReactNode;
  authenticated: boolean;
  loading: boolean;
  notFound?: boolean;
  error: string | null;
  starting: boolean;
  canStart: boolean;
  countrySection?: ReactNode;
  onLogin: () => void;
  onStart: () => void;
};

export function PracticeStartLayout({
  title,
  description,
  thumbs,
  authenticated,
  loading,
  notFound,
  error,
  starting,
  canStart,
  countrySection,
  onLogin,
  onStart,
}: Props) {
  return (
    <Page>
      <Page.Header>
        <Heading color="gray.800" size="lg" m={0}>
          {title}
        </Heading>
      </Page.Header>
      <Page.Body>
        {loading ? (
          <Flex justify="center" py={12}>
            <Spinner size="lg" colorPalette="primary" />
          </Flex>
        ) : notFound ? (
          <Text color="primary.700">
            <FormattedMessage
              id="practice_not_found"
              defaultMessage="This practice quiz could not be found."
            />
          </Text>
        ) : (
          <VStack gap={5} align="stretch">
            {thumbs}
            <Text color="primary.700">{description}</Text>
            {error ? <Text color="red.600">{error}</Text> : null}
            {!authenticated ? (
              <Box>
                <Text color="primary.700" mb={3}>
                  <FormattedMessage
                    id="practice_login"
                    defaultMessage="Log in to start this practice quiz."
                  />
                </Text>
                <Button colorPalette="primary" alignSelf="flex-start" onClick={onLogin}>
                  <FormattedMessage id="login" defaultMessage="Login" />
                </Button>
              </Box>
            ) : (
              <>
                {countrySection}
                <Button
                  colorPalette="primary"
                  alignSelf="flex-start"
                  loading={starting}
                  disabled={!canStart || starting}
                  onClick={onStart}
                >
                  <FormattedMessage id="practice_start" defaultMessage="Start practice" />
                </Button>
              </>
            )}
          </VStack>
        )}
      </Page.Body>
    </Page>
  );
}
