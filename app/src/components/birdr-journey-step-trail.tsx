import { Box, Flex, Text } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { FaCheck, FaFeatherAlt, FaBookOpen, FaBinoculars } from 'react-icons/fa';
import { FormattedMessage } from 'react-intl';
import type { JourneyLevel, JourneyStep } from '../api/birdrJourney';
import { isDifficultJourneyStep, isFamilyJourneyStep } from '../api/birdrJourney';
import { BirdrLevelImage } from './birdr-level-image';

type Props = {
  currentLevel: JourneyLevel;
  nextLevel: JourneyLevel | null;
  onStepPress: (step: JourneyStep) => void;
  canPlay?: boolean;
};

const STEP_SIZE = 44;
const CURRENT_STEP_SIZE = 72;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  45% { transform: scale(1.1); }
  90% { transform: scale(1); }
`;

function StepIcon({
  step,
  onPress,
  canPlay,
}: {
  step: JourneyStep;
  onPress?: () => void;
  canPlay?: boolean;
}) {
  const isCompleted = step.status === 'completed';
  const isCurrent = step.status === 'current';
  const isLocked = step.status === 'locked';
  const isPlayable = isCurrent && !!onPress && !!canPlay;
  const size = isCurrent ? CURRENT_STEP_SIZE : STEP_SIZE;
  const iconSize = isCurrent ? 28 : 20;

  const backgroundColor = isCompleted
    ? 'primary.500'
    : isCurrent
      ? 'primary.800'
      : 'primary.200';

  const iconColor = isLocked ? 'primary.400' : 'primary.50';

  const circle = (
    <Flex
      width={`${size}px`}
      height={`${size}px`}
      borderRadius="full"
      bg={backgroundColor}
      align="center"
      justify="center"
      borderWidth={isCurrent ? '3px' : undefined}
      borderColor={isCurrent ? 'primary.400' : undefined}
    >
      {isCompleted ? (
        <Box color="primary.50">
          <FaCheck size={iconSize - 8} />
        </Box>
      ) : isFamilyJourneyStep(step) ? (
        <Box color={iconColor}>
          <FaBookOpen size={iconSize - 2} />
        </Box>
      ) : isDifficultJourneyStep(step) ? (
        <Box color={iconColor}>
          <FaBinoculars size={iconSize - 2} />
        </Box>
      ) : (
        <Box color={iconColor}>
          <FaFeatherAlt size={iconSize} />
        </Box>
      )}
    </Flex>
  );

  if (isPlayable) {
    return (
      <Flex direction="column" align="center" cursor="pointer" onClick={onPress}>
        <Box animation={`${pulse} 2s ease-in-out infinite`}>{circle}</Box>
        <Text
          mt={2}
          fontSize="md"
          fontWeight="700"
          color="primary.800"
          textTransform="uppercase"
          letterSpacing="wider"
        >
          <FormattedMessage id="play" defaultMessage="Play" />
        </Text>
      </Flex>
    );
  }

  if (isCurrent) {
    return (
      <Flex direction="column" align="center">
        <Box animation={`${pulse} 2s ease-in-out infinite`}>{circle}</Box>
      </Flex>
    );
  }

  return circle;
}

function Connector() {
  return (
    <Box
      width="4px"
      height="24px"
      my={1}
      borderRadius="sm"
      bg="primary.200"
    />
  );
}

export function BirdrJourneyStepTrail({
  currentLevel,
  nextLevel,
  onStepPress,
  canPlay = true,
}: Props) {
  const steps = [...(currentLevel.steps ?? [])].sort((a, b) => a.sequence - b.sequence);

  return (
    <Flex direction="column" align="center" py={2}>
      <BirdrLevelImage iconUrl={currentLevel.icon_url} variant="current" size={140} />
      <Connector />

      {steps.map((step, index) => (
        <Flex key={step.id} direction="column" align="center">
          <StepIcon
            step={step}
            onPress={step.status === 'current' ? () => onStepPress(step) : undefined}
            canPlay={canPlay}
          />
          {index < steps.length - 1 && <Connector />}
        </Flex>
      ))}

      {nextLevel && (
        <>
          <Connector />
          <BirdrLevelImage iconUrl={nextLevel.icon_url} variant="next" size={140} />
        </>
      )}
    </Flex>
  );
}
