import { Box, Text } from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { FloatingFeather } from './floating-feather';

type Props = {
  /** Fixed stage height (prevents layout jump vs question media). */
  height?: string | number;
  minHeight?: string | number;
  showLabel?: boolean;
};

/** Shown while waiting for the next question (replaces bird media). */
export function QuestionLoadingFeather({
  height,
  minHeight = '280px',
  showLabel = true,
}: Props) {
  const stageHeight = height ?? minHeight;

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
        <Text fontSize="sm" color="primary.700">
          <FormattedMessage id="loading question" defaultMessage="Loading question..." />
        </Text>
      ) : null}
    </Box>
  );
}
