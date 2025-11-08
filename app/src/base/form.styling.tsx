import { defineRecipe, defineSlotRecipe } from '@chakra-ui/react'

// Export both radio and checkbox themes

/**
 * Link theme - styled anchor links with primary color
 * Uses simple recipe (no slots) like Button
 */
export const linkTheme = defineRecipe({
  className: 'link',
  base: {
    color: 'primary.500',
    textDecoration: 'underline',
    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
    fontWeight: 'bold',
    _hover: {
      color: 'primary.600',
      textDecoration: 'underline',
      transform: 'translateY(-2px) scale(1.02)',
      textShadow: '0 2px 4px rgba(139, 100, 25, 0.3)',
    },
    _active: {
      transform: 'none',
      textShadow: 'none',
    },
    _focus: {
      color: 'primary.600',
      textDecoration: 'underline',
      outline: '2px solid',
      outlineColor: 'primary.500',
      outlineOffset: '2px',
    },
  },
})

/**
 * Input theme - styled text input fields with primary color
 * Uses simple recipe (no slots) like Button
 */
export const inputTheme = defineRecipe({
  className: 'input',
  base: {
    borderWidth: '2px',
    borderColor: 'primary.300',
    borderRadius: 'md',
    padding: '4px 8px',
    fontWeight: 'bold',
    color: 'primary.500',
    bg: 'white',
    _focus: {
      borderColor: 'primary.500',
      boxShadow: '0 0 0 1px {colors.primary.500}',
    },
  },
})

/**
 * Textarea theme - styled textarea fields with primary color
 * Same styling as input for consistency
 */
export const textareaTheme = defineRecipe({
  className: 'textarea',
  base: {
    borderWidth: '2px',
    borderColor: 'primary.300',
    borderRadius: 'md',
    padding: '4px 8px',
    fontWeight: 'bold',
    color: 'primary.500',
    bg: 'white',
    _focus: {
      borderColor: 'primary.500',
      boxShadow: '0 0 0 1px {colors.primary.500}',
    },
  },
})

/**
 * Select theme - styled dropdown select fields with primary color
 * Uses slot recipe with multiple slots for complete styling
 */
export const selectTheme = defineSlotRecipe({
  className: 'select',
  slots: [
    'root',
    'control',
    'trigger',
    'valueText',
    'indicatorGroup',
    'indicator',
    'clearTrigger',
    'positioner',
    'content',
    'list',
    'item',
    'itemText',
    'itemIndicator',
  ],
  base: {
    root: {
      width: 'full',
    },
    control: {
      bg: 'white',
    },
    trigger: {
      borderWidth: '2px',
      borderColor: 'primary.500',
      borderRadius: 'md',
      padding: '4px 8px',
      fontWeight: 'bold',
      color: 'primary.500',
      bg: 'white',
      _focus: {
        borderColor: 'primary.500',
      },
    },
    indicatorGroup: {
      gap: '2',
    },
    indicator: {
      color: 'primary.500',
    },
    clearTrigger: {
      color: 'primary.500',
      _hover: {
        color: 'primary.700',
      },
    },
    positioner: {
      zIndex: 'dropdown',
    },
    content: {
      bg: 'transparent',
      borderRadius: 'md',
      boxShadow: 'xl',
    },
    list: {
      bg: 'white',
      borderRadius: 'md',
      borderWidth: '2px',
      borderColor: 'primary.300',
      padding: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '2',
    },
    item: {
      bg: 'white',
      padding: '8px 12px',
      borderRadius: 'sm',
      cursor: 'pointer',
      transition: 'background-color 0.15s ease-in-out',
      _hover: {
        bg: 'orange.200',
      },
      '&[data-highlighted]': {
        bg: 'primary.100',
      },
      '&[data-state="checked"]': {
        bg: 'primary.200',
      },
    },
    itemText: {
      color: 'primary.700',
    },
    itemIndicator: {
      color: 'primary.500',
    },
    valueText: {
      color: 'primary.500',
    },
  },
})

/**
 * RadioGroup theme - styled radio buttons with primary color
 * Uses the proper slot names so the unchecked state remains visible
 */
export const radioTheme = defineSlotRecipe({
  className: 'radio-group',
  slots: ['root', 'item', 'itemControl', 'itemText', 'itemIndicator'],
  base: {
    root: {},
    item: {
      alignItems: 'center',
      gap: '8px',
    },
    itemControl: {
      borderWidth: '2px',
      borderColor: 'primary.500',
      borderRadius: 'full',
      width: '20px',
      height: '20px',
      bg: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease-in-out',
      _checked: {
        borderColor: 'primary.500',
        bg: 'primary.500',
      },
      _focusVisible: {
        boxShadow: '0 0 0 2px {colors.primary.200}',
      },
      _hover: {
        borderColor: 'primary.400',
      },
    },
    itemIndicator: {
      width: '8px',
      height: '8px',
      borderRadius: 'full',
      bg: 'white',
      transform: 'scale(0)',
      transition: 'transform 0.2s ease-in-out',
      '&[data-state=checked]': {
        transform: 'scale(1)',
      },
    },
    itemText: {
      color: 'primary.700',
    },
  },
})

/**
 * Checkbox theme - styled checkboxes with primary color
 */
export const checkboxTheme = defineSlotRecipe({
  className: 'checkbox',
  slots: ['root', 'control', 'indicator', 'label'],
  base: {
    root: {
      alignItems: 'center',
      gap: '8px',
    },
    control: {
      borderWidth: '2px',
      borderColor: 'primary.500',
      borderRadius: 'sm',
      width: '20px',
      height: '20px',
      bg: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease-in-out',
      _checked: {
        borderColor: 'primary.500',
        bg: 'primary.500',
        color: 'white',
      },
      _focusVisible: {
        boxShadow: '0 0 0 2px {colors.primary.200}',
      },
      _hover: {
        borderColor: 'primary.400',
      },
    },
    indicator: {
      color: 'white',
      fontSize: '12px',
      opacity: 0,
      transition: 'opacity 0.2s ease-in-out',
      '&[data-state=checked]': {
        opacity: 1,
      },
    },
    label: {
      fontWeight: 'medium',
      color: 'primary.700',
    },
  },
})

