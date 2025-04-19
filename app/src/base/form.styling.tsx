import { defineStyle, defineStyleConfig } from '@chakra-ui/react'

const baseInput = defineStyle({
  field: {
    borderRadius: '20px',
    borderColor: 'orange.300',
    borderWidth: '2px',
    fontSize: 'lg',
    fontWeight: 'bold',
    textColor: 'orange.500',
    transition: 'all 0.2s ease-in-out',
    _hover: {
      transform: 'scale(1.02)',
      boxShadow: 'md',
    },
    _focus: {
      transform: 'scale(1.02)',
      boxShadow: 'lg',
      borderColor: 'orange.500',
      textColor: 'orange.600',
    },
    _invalid: {
      borderColor: 'red.400',
      boxShadow: '0 0 0 1px red.400',
    }
  }
})

const baseSelect = defineStyle({
  field: {
    borderColor: 'orange.300',
    borderWidth: '2px',
    fontSize: 'lg',
    fontWeight: 'bold',
    textColor: 'orange.500',
    transition: 'all 0.2s ease-in-out',
    _hover: {
      transform: 'scale(1.02)',
      boxShadow: 'md',
    },
    _focus: {
      transform: 'scale(1.02)',
      boxShadow: 'lg',
      borderColor: 'orange.500',
      textColor: 'orange.600',
    }
  },
  icon: {
    color: 'orange.500',
  }
})

const baseCheckbox = defineStyle({
  control: {
    borderRadius: 'full',
    borderColor: 'orange.300',
    borderWidth: '2px',
    transition: 'all 0.2s ease-in-out',
    w: '1.5em',
    h: '1.5em',
    _hover: {
      transform: 'scale(1.1)',
      borderColor: 'orange.400',
    },
    _checked: {
      bg: 'orange.500',
      borderColor: 'orange.500',
      _hover: {
        bg: 'orange.600',
        borderColor: 'orange.600',
      }
    }
  },
  icon: {
    fontSize: '0.8em',
    color: 'white',
  },
  label: {
    fontSize: 'lg',
    fontWeight: 'bold',
    color: 'orange.500',
  }
})

const baseRadio = defineStyle({
  control: {
    borderRadius: 'full',
    borderColor: 'orange.300',
    borderWidth: '2px',
    transition: 'all 0.2s ease-in-out',
    w: '1.5em',
    h: '1.5em',
    _hover: {
      transform: 'scale(1.1)',
      borderColor: 'orange.400',
    },
    _checked: {
      bg: 'orange.500',
      borderColor: 'orange.500',
      _hover: {
        bg: 'orange.600',
        borderColor: 'orange.600',
      }
    }
  },
  label: {
    fontSize: 'lg',
    fontWeight: 'bold',
    color: 'orange.500',
  }
})

export const inputTheme = defineStyleConfig({
  defaultProps: {
    variant: 'base',
  },
  variants: {
    base: baseInput,
  },
})

export const selectTheme = defineStyleConfig({
  defaultProps: {
    variant: 'base',
  },
  variants: {
    base: baseSelect,
  },
})

export const checkboxTheme = defineStyleConfig({
  defaultProps: {
    variant: 'base',
  },
  variants: {
    base: baseCheckbox,
  },
})

export const radioTheme = defineStyleConfig({
  defaultProps: {
    variant: 'base',
  },
  variants: {
    base: baseRadio,
  },
}) 