import { useColorModeValue } from '@chakra-ui/react';

export const useSliderStyles = () => {
  const trackBg = useColorModeValue('orange.100', 'orange.700');
  const markColor = useColorModeValue('orange.500', 'orange.600');
  const thumbBg = useColorModeValue('orange.500', 'orange.300');
  const thumbColor = useColorModeValue('white', 'gray.800');

  return {
    track: {
      bg: trackBg,
    },
    filledTrack: {
      bg: 'orange.500',
    },
    thumb: {
      boxSize: 8,
      bg: thumbBg,
      color: thumbColor,
      _focus: { 
        boxShadow: '0 0 0 3px rgba(237, 137, 54, 0.3)',
      },
    },
    mark: {
      color: markColor,
      fontWeight: 'bold',
      fontSize: 'lg',
      mt: 6,
      ml: -1
    }
  };
}; 