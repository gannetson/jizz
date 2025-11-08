import { createSystem, defaultConfig, defineGlobalStyles } from '@chakra-ui/react'
import { buttonTheme } from './base/button.styling'
import { inputTheme, selectTheme, checkboxTheme, radioTheme, linkTheme } from './base/form.styling'

const globalStyles = defineGlobalStyles({
      body: {
        color: 'orange.800',
      },
      h1: {
        color: 'orange.800',
      },
      h2: {
        color: 'orange.800',
      },
      h3: {
        color: 'orange.800',
      },
      h4: {
        color: 'orange.800',
      },
      h5: {
        color: 'orange.800',
      },
      h6: {
        color: 'orange.800',
      },
})

export const system = createSystem(defaultConfig, {
  globalCss: globalStyles,
  theme: {
    recipes: {
      button: buttonTheme,
      input: inputTheme,
      select: selectTheme,
      checkbox: checkboxTheme,
      radio: radioTheme,
      link: linkTheme,
    },
  },
}) 