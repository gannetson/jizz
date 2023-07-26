import {ReactNode} from 'react'

import PageHeader from "./page-header";
import PageBody from "./page-body";
import {Grid} from "@chakra-ui/react";

Page.Header = PageHeader
Page.Body = PageBody

interface Properties {
  children: ReactNode
}

export default function Page({ children }: Properties) {
  return (
    <Grid
      gridColumnGap="6"
      gridRowGap="8"
      gridTemplateAreas={{
        base: `
                  "header"
                  "body"`,
        md: `
                  "header"
                  "body"`,
      }}
    >
      {children}
    </Grid>
  )
}
