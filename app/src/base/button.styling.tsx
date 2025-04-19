import { defineStyle, defineStyleConfig } from '@chakra-ui/react'

const primary = defineStyle({
  colorScheme: 'orange',
  boxShadow: 'md',
  transition: 'all 0.2s ease-in-out',
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
  }
})

export const buttonTheme = defineStyleConfig({
  defaultProps: {
    colorScheme: 'orange',
  },
  baseStyle: {
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
      borderRadius: 'full',
    transition: 'all 0.2s ease-in-out',
  },
  variants: { primary },
})