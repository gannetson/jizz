import { Box, Image, Spinner, Text, VStack } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FormattedMessage } from 'react-intl';

export type BirdrMood = 'waiting' | 'success' | 'failed' | 'stressed';

const MOOD_IMAGES: Record<BirdrMood, string> = {
  waiting: '/images/birdr-waiting.png',
  success: '/images/birdr-success.png',
  failed: '/images/birdr-failed.png',
  stressed: '/images/birdr-stressed.png',
};

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
`;

type Props = {
  mood: BirdrMood;
  titleId?: string;
  titleDefault?: string;
  subtitleId?: string;
  subtitleDefault?: string;
  showSpinner?: boolean;
  pulse?: boolean;
};

export function BirdrMoodHero({
  mood,
  titleId,
  titleDefault,
  subtitleId,
  subtitleDefault,
  showSpinner = false,
  pulse: shouldPulse = false,
}: Props) {
  return (
    <VStack gap={4} py={6} px={6} align="center">
      <Box
        animation={shouldPulse ? `${pulse} 2s ease-in-out infinite` : undefined}
      >
        <Image
          src={MOOD_IMAGES[mood]}
          alt=""
          width="220px"
          height="220px"
          objectFit="contain"
        />
      </Box>
      {showSpinner && <Spinner size="lg" color="primary.500" />}
      {titleId && (
        <Text fontSize="xl" fontWeight="700" color="primary.800" textAlign="center">
          <FormattedMessage id={titleId} defaultMessage={titleDefault} />
        </Text>
      )}
      {subtitleId && (
        <Text fontSize="md" color="primary.600" textAlign="center" lineHeight="tall">
          <FormattedMessage id={subtitleId} defaultMessage={subtitleDefault} />
        </Text>
      )}
    </VStack>
  );
}
