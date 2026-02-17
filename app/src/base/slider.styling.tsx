import { defaultConfig, defineSlotRecipe } from '@chakra-ui/react'

const defaultSliderRecipe = defaultConfig.theme?.slotRecipes?.slider
const defaultSliderSlots = defaultSliderRecipe?.slots ?? [
  'root',
  'control',
  'label',
  'thumb',
  'track',
  'range',
]

export const sliderTheme = defineSlotRecipe({
  ...defaultSliderRecipe,
  className: 'slider',
  slots: defaultSliderSlots,
  base: {
    ...(defaultSliderRecipe?.base ?? {}),
    track: {
      ...(defaultSliderRecipe?.base?.track ?? {}),
      bg: 'primary.200',
    },
    range: {
      ...(defaultSliderRecipe?.base?.range ?? {}),
      bg: 'primary.500',
    },
    thumb: {
      ...(defaultSliderRecipe?.base?.thumb ?? {}),
      bg: 'primary.600',
    },
  },
})
