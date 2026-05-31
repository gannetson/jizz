import { Box, Image } from '@chakra-ui/react';
import { FaCheck, FaLock } from 'react-icons/fa';
import { resolveMediaUrl } from '../api/baseUrl';

export type BirdrLevelImageVariant = 'current' | 'next' | 'locked' | 'completed';

type Props = {
  iconUrl?: string | null;
  variant: BirdrLevelImageVariant;
  size?: number;
};

const SIZE_BY_VARIANT: Record<BirdrLevelImageVariant, number> = {
  current: 180,
  next: 110,
  locked: 72,
  completed: 88,
};

export function BirdrLevelImage({ iconUrl, variant, size }: Props) {
  const dimension = size ?? SIZE_BY_VARIANT[variant];
  const isSilhouette = variant === 'next' || variant === 'locked';
  const isCompleted = variant === 'completed';
  const borderRadius = `${dimension * 0.12}px`;
  const resolvedUrl = resolveMediaUrl(iconUrl);

  return (
    <Box
      position="relative"
      width={`${dimension}px`}
      height={`${dimension}px`}
      borderRadius={borderRadius}
      bg="primary.100"
      overflow="hidden"
      borderWidth={variant === 'current' ? '3px' : undefined}
      borderColor={variant === 'current' ? 'primary.400' : undefined}
    >
      {resolvedUrl ? (
        <>
          <Image
            src={resolvedUrl}
            alt=""
            width={`${dimension}px`}
            height={`${dimension}px`}
            objectFit="contain"
            filter={isSilhouette ? 'blur(8px)' : undefined}
            opacity={isSilhouette ? 0.8 : isCompleted ? 0.75 : 1}
            bg={isSilhouette ? 'primary.900' : 'transparent'}
          />
          {isSilhouette && (
            <Box
              position="absolute"
              inset={0}
              bg="blackAlpha.400"
              borderRadius={borderRadius}
            />
          )}
        </>
      ) : (
        <Box width="100%" height="100%" bg="primary.700" />
      )}
      {variant === 'locked' && (
        <Box
          position="absolute"
          bottom="6px"
          right="6px"
          bg="primary.700"
          borderRadius="full"
          width="24px"
          height="24px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="primary.50"
        >
          <FaLock size={12} />
        </Box>
      )}
      {isCompleted && (
        <Box
          position="absolute"
          bottom="6px"
          right="6px"
          bg="green.500"
          borderRadius="full"
          width="24px"
          height="24px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="white"
        >
          <FaCheck size={12} />
        </Box>
      )}
    </Box>
  );
}
