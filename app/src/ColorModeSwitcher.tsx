import * as React from "react"
import {
  IconButton,
  IconButtonProps,
} from "@chakra-ui/react"
import { FaMoon, FaSun } from "react-icons/fa"

type ColorModeSwitcherProps = Omit<IconButtonProps, "aria-label">

// In Chakra UI v3, color mode handling is different
// For now, using light mode as default
export const ColorModeSwitcher: React.FC<ColorModeSwitcherProps> = (props) => {
  const [colorMode, setColorMode] = React.useState<'light' | 'dark'>('light')
  const toggleColorMode = () => {
    setColorMode(prev => prev === 'light' ? 'dark' : 'light')
  }
  const text = colorMode === 'light' ? "dark" : "light"
  const SwitchIcon = colorMode === 'light' ? FaMoon : FaSun

  return (
    <IconButton
      size="md"
      fontSize="lg"
      variant="ghost"
      color="current"
      marginLeft="2"
      onClick={toggleColorMode}
      children={<SwitchIcon />}
      aria-label={`Switch to ${text} mode`}
      {...props}
    />
  )
}
