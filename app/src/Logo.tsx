import * as React from "react"
import {
  chakra,
  ImageProps,
} from "@chakra-ui/react"
import { forwardRef } from "react"
import logo from "./logo.svg"
import { keyframes } from "@emotion/react";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

export const Logo = forwardRef<HTMLImageElement, ImageProps>((props, ref) => {
  // In Chakra UI v3, usePrefersReducedMotion is not available
  // Using animation by default
  const animation = `${spin} infinite 20s linear`

  return <chakra.img animation={animation} src={logo} ref={ref} {...props} />
})
