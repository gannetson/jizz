import * as React from "react"
import {useEffect} from "react"
import {AppContextProvider} from "./core/app-context-provider";
import {WebsocketContextProvider} from "./core/websocket-context-provider"
import {MainContent} from "./main-content"
import {registerServiceWorker} from "./core/register-service-worker"
import { ChakraProvider } from '@chakra-ui/react'
import { theme } from './theme'

registerServiceWorker()

export const App = () => {
  useEffect(() => {
    document.title = "Birdr"
  }, [])

  return (
    <ChakraProvider theme={theme} resetCSS>
      <AppContextProvider>
        <WebsocketContextProvider>
          <MainContent/>
        </WebsocketContextProvider>
      </AppContextProvider>
    </ChakraProvider>
  )
}

export default App

