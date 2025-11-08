import { defineSlotRecipe, defineRecipe } from '@chakra-ui/react'

export const inputTheme = defineSlotRecipe({
  className: 'input',
  slots: ['field'],
  base: {
    field: {
      borderRadius: '20px',
      borderColor: 'orange.300',
      borderWidth: '2px',
      fontSize: 'lg',
      fontWeight: 'bold',
      color: 'orange.500',
      transition: 'all 0.2s ease-in-out',
      _hover: {
        transform: 'scale(1.02)',
        boxShadow: 'md',
      },
      _focus: {
        transform: 'scale(1.02)',
        boxShadow: 'lg',
        borderColor: 'orange.500',
        color: 'orange.600',
      },
      _invalid: {
        borderColor: 'red.400',
        boxShadow: '0 0 0 1px red.400',
      }
    }
  },
})

export const selectTheme = defineSlotRecipe({
  className: 'select',
  slots: ['field', 'icon', 'placeholder'],
  base: {
    field: {
      borderColor: 'orange.300',
      borderWidth: '2px',
      fontSize: 'lg',
      fontWeight: 'bold',
      color: 'orange.500',
      transition: 'all 0.2s ease-in-out',
      _hover: {
        transform: 'scale(1.02)',
        boxShadow: 'md',
      },
      _focus: {
        transform: 'scale(1.02)',
        boxShadow: 'lg',
        borderColor: 'orange.500',
        color: 'orange.600',
      }
    },
    icon: {
      color: 'orange.500',
    },
    placeholder: {
      color: 'orange.400',
      fontWeight: 'normal',
    }
  },
})

export const checkboxTheme = defineSlotRecipe({
  className: 'checkbox',
  slots: ['control', 'icon', 'label'],
  base: {
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
    },
  },
})

export const radioTheme = defineSlotRecipe({
  className: 'radio',
  slots: ['control', 'label'],
  base: {
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
  },
})

export const linkTheme = defineRecipe({
  className: 'link',
  base: {
    color: 'orange.500',
    textDecoration: 'underline',
    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    fontWeight: 'bold',
    _hover: {
      color: 'orange.600',
      textDecoration: 'underline',
      transform: 'translateY(-2px) scale(1.02)',
      textShadow: '0 2px 4px rgba(237, 137, 54, 0.3)',
    },
    _active: {
      transform: 'none',
      textShadow: 'none',
    },
    _focus: {
      color: 'orange.600',
      textDecoration: 'underline',
    }
  },
  variants: {
    variant: {
      base: {},
      menu: {
        textDecoration: 'none',
        _hover: {
          textDecoration: 'none',
        },
        _focus: {
          textDecoration: 'none',
        }
      }
    }
  },
  defaultVariants: {
    variant: 'base',
  },
}) 