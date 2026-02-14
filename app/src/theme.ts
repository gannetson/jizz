import { createSystem, defaultConfig, defineGlobalStyles } from '@chakra-ui/react'
import { buttonTheme } from './base/button.styling'
import { linkTheme, inputTheme, selectTheme, textareaTheme, radioTheme, checkboxTheme } from './base/form.styling'
import { dialogTheme } from './base/dialog.styling'

const globalStyles = defineGlobalStyles({
  body: {
    color: 'primary.800',
  },
  h1: {
    color: 'primary.800',
  },
  h2: {
    color: 'primary.800',
  },
  h3: {
    color: 'primary.800',
  },
  h4: {
    color: 'primary.800',
  },
  h5: {
    color: 'primary.800',
  },
  h6: {
    color: 'primary.800',
  },
  li: {
    listStyleType: 'none',
  },
})

/**
 * Custom color palettes for the application
 * These colors are automatically available as colorPalette options
 * in components that support the colorPalette prop
 */
const customColors = {
  birdr: {
    50: { value: '#f5ede0' },
    100: { value: '#e8d4b8' },
    200: { value: '#d4b88a' },
    300: { value: '#c09c5c' },
    400: { value: '#ac802e' },
    500: { value: '#8b6419' }, // Base: browner and darker ochre/brown
    600: { value: '#6d4e14' },
    700: { value: '#4f380f' },
    800: { value: '#31220a' },
    900: { value: '#130c05' },
  },
  primary: {
    50: { value: '#f5ede0' },
    100: { value: '#e8d4b8' },
    200: { value: '#d4b88a' },
    300: { value: '#c09c5c' },
    400: { value: '#ac802e' },
    500: { value: '#8b6419' }, // Base: browner and darker ochre/brown
    600: { value: '#6d4e14' },
    700: { value: '#4f380f' },
    800: { value: '#31220a' },
    900: { value: '#130c05' },
  },
  error: {
    50: { value: '#ffe5e5' },
    100: { value: '#ffb3b3' },
    200: { value: '#ff8080' },
    300: { value: '#ff4d4d' },
    400: { value: '#cc1a1a' },
    500: { value: '#990000' }, // Base: darker and warmer red
    600: { value: '#7a0000' },
    700: { value: '#5c0000' },
    800: { value: '#3d0000' },
    900: { value: '#1f0000' },
  },
  success: {
    50: { value: '#d4e8d4' },
    100: { value: '#a8d1a8' },
    200: { value: '#7cba7c' },
    300: { value: '#50a350' },
    400: { value: '#248c24' },
    500: { value: '#1a6b1a' }, // Base: darker green
    600: { value: '#145214' },
    700: { value: '#0e3a0e' },
    800: { value: '#082108' },
    900: { value: '#020902' },
  },
  warning: {
    50: { value: '#fff4e6' },
    100: { value: '#ffe0b3' },
    200: { value: '#ffcc80' },
    300: { value: '#ffb84d' },
    400: { value: '#ffa31a' },
    500: { value: '#cc6600' }, // Base: dark orange
    600: { value: '#994d00' },
    700: { value: '#663300' },
    800: { value: '#331a00' },
    900: { value: '#1a0d00' },
  },
}

export const system = createSystem({
  ...defaultConfig,
  theme: {
    ...defaultConfig.theme,
    tokens: {
      ...defaultConfig.theme?.tokens,
      colors: {
        ...defaultConfig.theme?.tokens?.colors,
        ...customColors,
      },
    },
    semanticTokens: {
      ...defaultConfig.theme?.semanticTokens,
      colors: {
        ...defaultConfig.theme?.semanticTokens?.colors,
        primary: {
          solid: { value: '{colors.primary.500}' },
          contrast: { value: '{colors.primary.50}' },
          fg: { value: '{colors.primary.800}' },
          muted: { value: '{colors.primary.100}' },
          subtle: { value: '{colors.primary.200}' },
          emphasized: { value: '{colors.primary.300}' },
          focusRing: { value: '{colors.primary.500}' },
        },
        error: {
          solid: { value: '{colors.error.500}' },
          contrast: { value: '{colors.error.50}' },
          fg: { value: '{colors.error.800}' },
          muted: { value: '{colors.error.100}' },
          subtle: { value: '{colors.error.200}' },
          emphasized: { value: '{colors.error.300}' },
          focusRing: { value: '{colors.error.500}' },
        },
        success: {
          solid: { value: '{colors.success.500}' },
          contrast: { value: '{colors.success.50}' },
          fg: { value: '{colors.success.800}' },
          muted: { value: '{colors.success.100}' },
          subtle: { value: '{colors.success.200}' },
          emphasized: { value: '{colors.success.300}' },
          focusRing: { value: '{colors.success.500}' },
        },
        warning: {
          solid: { value: '{colors.warning.500}' },
          contrast: { value: '{colors.warning.50}' },
          fg: { value: '{colors.warning.800}' },
          muted: { value: '{colors.warning.100}' },
          subtle: { value: '{colors.warning.200}' },
          emphasized: { value: '{colors.warning.300}' },
          focusRing: { value: '{colors.warning.500}' },
        },
        birdr: {
          solid: { value: '{colors.birdr.500}' },
          contrast: { value: '{colors.birdr.50}' },
          fg: { value: '{colors.birdr.800}' },
          muted: { value: '{colors.birdr.100}' },
          subtle: { value: '{colors.birdr.200}' },
          emphasized: { value: '{colors.birdr.300}' },
          focusRing: { value: '{colors.birdr.500}' },
        },
      },
    },
    recipes: {
      ...defaultConfig.theme?.recipes,
      button: buttonTheme,
      link: linkTheme,
      input: inputTheme,
      textarea: textareaTheme,
    },
    slotRecipes: {
      ...defaultConfig.theme?.slotRecipes,
      select: selectTheme,
      radioGroup: radioTheme,
      checkbox: checkboxTheme,    
      dialog: dialogTheme,
    },
  },
  globalCss: globalStyles,
})