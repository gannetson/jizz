import { extendTheme } from '@chakra-ui/react'
import { buttonTheme } from './base/button.styling'
import { inputTheme, selectTheme, checkboxTheme, radioTheme } from './base/form.styling'

export const theme = extendTheme({
  styles: {
    global: {
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
    },
  },
  components: {
    Button: buttonTheme,
    Input: inputTheme,
    Select: selectTheme,
    Checkbox: checkboxTheme,
    Radio: radioTheme,
  },
}) 