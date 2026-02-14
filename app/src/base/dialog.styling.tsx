import { defaultConfig, defineSlotRecipe } from '@chakra-ui/react'

const defaultDialogRecipe = defaultConfig.theme?.slotRecipes?.dialog
const defaultDialogSlots = defaultDialogRecipe?.slots ?? [
  'positioner',
  'header',
  'body',
  'footer',
]

export const dialogTheme = defineSlotRecipe({
  ...defaultDialogRecipe,
  className: 'dialog',
  slots: defaultDialogSlots,
  base: {
    ...(defaultDialogRecipe?.base ?? {}),
    header: {
      ...(defaultDialogRecipe?.base?.header ?? {}),
      fontSize: 'xl',
      fontWeight: 'bold',
      color: 'primary.500',
    },
    title: {
      ...(defaultDialogRecipe?.base?.title ?? {}),
      fontSize: 'xl',
      fontWeight: 'bold',
      color: 'primary.500',
    },
  },
})