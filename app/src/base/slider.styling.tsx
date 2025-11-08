// In Chakra UI v3, useColorModeValue is not available
// Using light mode values as default
export const useSliderStyles = () => {
  const trackBg = 'orange.100';
  const markColor = 'orange.500';
  const thumbBg = 'orange.500';
  const thumbColor = 'white';

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
      zIndex: 'auto'
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