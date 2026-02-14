import { defineRecipe } from '@chakra-ui/react'

export const buttonTheme = defineRecipe({
  className: 'button',
  base: {
    minH: '44px', // Minimum touch target size
    minW: '44px', // Minimum touch target size
    px: '24px', // Horizontal padding
    py: '12px', // Vertical padding
    borderRadius: 'full',
    transition: 'all 0.2s ease-in-out',
    fontWeight: 'bold',
    // Prevent double-tap zoom
    touchAction: 'manipulation',
    // Ensure proper touch feedback
    WebkitTapHighlightColor: 'transparent',
    cursor: 'pointer',
    bg: 'colorPalette.500',
    color: 'white',
    _hover: {
      bg: 'colorPalette.600',
      transform: 'scale(1.05)',
      boxShadow: 'xl',
      _disabled: {
        transform: 'none',
        boxShadow: 'md',
      }
    },
    _active: {
      transform: 'scale(0.95)',
      boxShadow: 'sm',
      bg: 'colorPalette.700',
    },
    _focus: {
      boxShadow: 'outline',
    },
    _focusVisible: {
      boxShadow: 'outline',
    },
    _disabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
      bg: 'colorPalette.500',
    },
    // Touch-specific styles
    '@media (hover: none)': {
      _hover: {
        transform: 'none',
        boxShadow: 'md',
        bg: 'colorPalette.500',
      }
    },
  },
  variants: {
    variant: {
      solid: {},
      ghost: {
        bg: 'transparent',
        color: 'colorPalette.500',
        _hover: {
          bg: 'colorPalette.100',
          transform: 'scale(1.05)',
        },
        _active: {
          bg: 'colorPalette.200',
          transform: 'scale(0.95)',
        },
      },
      outline: {
        bg: 'transparent',
        borderWidth: '2px',
        borderColor: 'colorPalette.500',
        color: 'colorPalette.500',
        _hover: {
          bg: 'colorPalette.50',
          borderColor: 'colorPalette.600',
        },
        _active: {
          bg: 'colorPalette.100',
          borderColor: 'colorPalette.700',
        },
      },
    },
  },
  defaultVariants: {
    colorPalette: 'primary' as any,
    variant: 'solid',
  },
})