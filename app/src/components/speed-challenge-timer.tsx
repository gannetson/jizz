import { Box, Text } from '@chakra-ui/react';
import { FormattedMessage } from 'react-intl';
import { useSpeedChallengeTimer } from '../hooks/useSpeedChallengeTimer';

type Props = {
  speedSeconds: number;
  active: boolean;
  questionId: number | null | undefined;
  onExpire: () => void;
};

export function SpeedChallengeTimer({ speedSeconds, active, questionId, onExpire }: Props) {
  const { progress, expired } = useSpeedChallengeTimer({
    speedSeconds,
    active,
    questionId,
    onExpire,
  });

  return (
    <Box mb={4}>
      <Text fontSize="sm" fontWeight="semibold" color="primary.700" mb={1}>
        {expired ? (
          <FormattedMessage id="speed_challenge_time_up" defaultMessage="Time's up!" />
        ) : (
          <FormattedMessage
            id="speed_challenge_timer"
            defaultMessage="Time left: {seconds}s"
            values={{ seconds: Math.max(0, Math.ceil(speedSeconds * (1 - progress / 100))) }}
          />
        )}
      </Text>
      <Box
        h="8px"
        borderRadius="full"
        bg="primary.100"
        overflow="hidden"
        borderWidth="1px"
        borderColor="primary.200"
      >
        <Box
          h="100%"
          w={`${progress}%`}
          bg={expired ? 'red.500' : 'primary.500'}
          transition="width 50ms linear"
        />
      </Box>
    </Box>
  );
}
