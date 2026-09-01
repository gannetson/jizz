import { Box, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { FloatingFeather } from './floating-feather';
import { PLAY_IMAGE_STAGE_HEIGHT } from './zoomable-play-image';

type Props = {
  /** Fixed stage height (prevents layout jump vs question media). */
  height?: string | number;
  minHeight?: string | number;
  showLabel?: boolean;
};

/** Shown while waiting for the next question (replaces bird media). */
export function QuestionLoadingFeather({
  height,
  minHeight = PLAY_IMAGE_STAGE_HEIGHT,
  showLabel = true,
}: Props) {
  const stageHeight = height ?? minHeight;
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSlowHint(true), 2500);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <Box
      width="100%"
      height={stageHeight}
      minHeight={minHeight}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={3}
      bg="primary.50"
      borderRadius="md"
      role="progressbar"
      aria-label="Loading next question"
    >
      <FloatingFeather />
      {showLabel ? (
        <Text fontSize="sm" color="primary.700" textAlign="center">
          <FormattedMessage id="loading question" defaultMessage="Loading question..." />
        </Text>
      ) : null}
      {showSlowHint ? (
        <Text fontSize="sm" color="primary.500" textAlign="center" px={4}>
          <FormattedMessage
            id="loading taking long"
            defaultMessage="This is taking longer than usual. Your connection may be slow."
          />
        </Text>
      ) : null}
    </Box>
  );
}
