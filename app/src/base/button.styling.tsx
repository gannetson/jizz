import { defineStyle, defineStyleConfig } from '@chakra-ui/react'

const primary = defineStyle({
  colorScheme: 'orange',
  boxShadow: 'md',
  transition: 'all 0.2s ease-in-out',
  minH: '44px', // Minimum touch target size
  minW: '44px', // Minimum touch target size
  px: '24px', // Horizontal padding
  py: '12px', // Vertical padding
  _hover: {
    transform: 'scale(1.05)',
    boxShadow: 'xl',
    _disabled: {
      transform: 'none',
      boxShadow: 'md'
    }
  },
  _active: {
    transform: 'scale(0.95)',
    boxShadow: 'sm'
  },
  _focus: {
    boxShadow: 'outline',
  },
  _focusVisible: {
    boxShadow: 'outline',
  },
  // Touch-specific styles
  '@media (hover: none)': {
    _hover: {
      transform: 'none',
      boxShadow: 'md'
    }
  },
  // Prevent double-tap zoom
  touchAction: 'manipulation',
  // Ensure proper touch feedback
  WebkitTapHighlightColor: 'transparent',
})

export const buttonTheme = defineStyleConfig({
  defaultProps: {
    colorScheme: 'orange',
  },
  baseStyle: {
    minH: '44px', // Minimum touch target size
    minW: '44px', // Minimum touch target size
    px: '24px', // Horizontal padding
    py: '12px', // Vertical padding
    _hover: {
      transform: 'scale(1.05)',
      boxShadow: 'xl',
      _disabled: {
        transform: 'none',
        boxShadow: 'md'
      }
    },
    _active: {
      transform: 'scale(0.95)',
      boxShadow: 'sm'
    },
    _focus: {
      boxShadow: 'outline',
    },
    _focusVisible: {
      boxShadow: 'outline',
    },
    borderRadius: 'full',
    transition: 'all 0.2s ease-in-out',
    // Touch-specific styles
    '@media (hover: none)': {
      _hover: {
        transform: 'none',
        boxShadow: 'md'
      }
    },
    // Prevent double-tap zoom
    touchAction: 'manipulation',
    // Ensure proper touch feedback
    WebkitTapHighlightColor: 'transparent',
  },
  variants: { primary },
})