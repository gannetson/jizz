import * as React from "react"
import {useEffect, useState} from "react"
import {ChakraProvider, theme,} from "@chakra-ui/react"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./pages/layout/layout";
import HomePage from "./pages/home";
import {AppContextProvider} from "./core/app-context-provider";
import GamePage from "./pages/game";
import MultiPlayerGame from "./pages/mpg/mpg"
import CreateGame from "./pages/mpg/create"
import JoinGame from "./pages/mpg/join"
import Lobby from "./pages/mpg/lobby"
import {AboutPage} from "./pages/about";
import {IntlProvider} from "react-intl";

import enMessages from './locales/en.json';
import nlMessages from './locales/nl.json';


export const App = () => {
  useEffect(() => {
    document.title = "Jizz"

  }, []);
  const [locale, setLocale] = useState('en')

  const messages = {
    en: enMessages,
    nl: nlMessages,
  }
  return (
    <AppContextProvider>
      <IntlProvider locale={locale} messages={messages['nl']}>
        <ChakraProvider theme={theme}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout/>}>
                <Route index element={<HomePage/>}/>
                <Route path='/game/' element={<GamePage/>}/>
                <Route path='/about/' element={<AboutPage/>}/>

                <Route path="/mpg/create" element={<CreateGame/>}/>
                <Route path="/mpg/join" element={<JoinGame/>}/>
                <Route path="/mpg/lobby/:gameCode" element={<Lobby/>}/>
                <Route path="/mpg/game/:gameCode/:playerName" element={<MultiPlayerGame/>}/>
              </Route>
            </Routes>
          </BrowserRouter>
        </ChakraProvider>
      </IntlProvider>
    </AppContextProvider>
  )
}

