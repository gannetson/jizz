import * as React from "react"
import {useEffect} from "react"
import {AppContextProvider} from "./core/app-context-provider";
import {WebsocketContextProvider} from "./core/websocket-context-provider"
import {MainContent} from "./main-content"


export const App = () => {
  useEffect(() => {
    document.title = "Jizz"

  }, []);


  return (
    <AppContextProvider>
      <WebsocketContextProvider>
        <MainContent />
      </WebsocketContextProvider>
    </AppContextProvider>
  )
}

