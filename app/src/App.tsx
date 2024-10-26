import * as React from "react"
import {useEffect} from "react"
import {AppContextProvider} from "./core/app-context-provider";
import {WebsocketContextProvider} from "./core/websocket-context-provider"
import {MainContent} from "./main-content"
import {ChakraProvider} from "@chakra-ui/react"
import {Provider} from "./components/ui/provider"


export const App = () => {
  useEffect(() => {
    document.title = "Jizz"

  }, []);


  return (
    <Provider>
      <AppContextProvider>
        <WebsocketContextProvider>
          <MainContent/>
        </WebsocketContextProvider>
      </AppContextProvider>
    </Provider>
  )
}

