import { defineStyle, defineStyleConfig } from '@chakra-ui/react'

const primary = defineStyle({
  borderRadius: 4,
  boxShadow: 'md',
  colorScheme: 'red'
})

export const buttonTheme = defineStyleConfig({

  variants: { primary },
})