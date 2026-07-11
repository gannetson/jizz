import { Box, Image } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

const floatFeather = keyframes`
  0%, 100% {
    transform: translateY(0) translateX(0) rotate(-10deg);
  }
  33% {
    transform: translateY(-14px) translateX(8px) rotate(10deg);
  }
  66% {
    transform: translateY(-4px) translateX(0) rotate(-6deg);
  }
`;

type Props = {
  size?: number;
};

/** Animated feather used in loading states (matches mobile). */
export function FloatingFeather({ size = 60 }: Props) {
  return (
    <Box animation={`${floatFeather} 3.2s ease-in-out infinite`} display="inline-flex">
      <Image
        src="/images/feather.png"
        alt=""
        width={`${size}px`}
        height={`${size}px`}
        objectFit="contain"
      />
    </Box>
  );
}
