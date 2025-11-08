import * as React from "react"
import {useEffect} from "react"
import {AppContextProvider} from "./core/app-context-provider";
import {WebsocketContextProvider} from "./core/websocket-context-provider"
import {MainContent} from "./main-content"
import {registerServiceWorker} from "./core/register-service-worker"
import { ChakraProvider, createToaster, Toaster } from '@chakra-ui/react'
import { system } from './theme'

registerServiceWorker()

// Create toaster instance for v3
export const toaster = createToaster({
  placement: 'bottom',
  pauseOnPageIdle: true,
})

export const App = () => {
  useEffect(() => {
    document.title = "Birdr"
  }, [])

  return (
    <ChakraProvider value={system}>
      <Toaster toaster={toaster} />
      <AppContextProvider>
        <WebsocketContextProvider>
          <MainContent/>
        </WebsocketContextProvider>
      </AppContextProvider>
    </ChakraProvider>
  )
}

export default App

