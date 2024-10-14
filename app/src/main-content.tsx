import * as React from "react"
import {useContext, useEffect, useState} from "react"
import {ChakraProvider, theme,} from "@chakra-ui/react"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./pages/layout/layout";
import HomePage from "./pages/home";
import {AppContextProvider} from "./core/app-context-provider";
import GamePage from "./pages/game";
import JoinGame from "./pages/mpg/join"
import Lobby from "./pages/mpg/lobby"
import {AboutPage} from "./pages/about";
import {IntlProvider} from "react-intl";

import enMessages from './locales/en.json';
import nlMessages from './locales/nl.json';
import MultiPlayerGame from "./pages/mpg/multi-player-game"
import AppContext from "./core/app-context"


export const MainContent = () => {
  useEffect(() => {
    document.title = "Jizz"

  }, []);
  const {language} = useContext(AppContext)


  const messages = {
    en: enMessages,
    nl: nlMessages,
  }

  return (
    <IntlProvider locale={language as 'en' | 'nl'} messages={messages[language as 'en' | 'nl']}>
      <ChakraProvider theme={theme}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout/>}>
              <Route index element={<HomePage/>}/>
              <Route path='/game/' element={<GamePage/>}/>
              <Route path='/about/' element={<AboutPage/>}/>

              <Route path="/mpg/join/:gameCode" element={<JoinGame/>}/>
              <Route path="/mpg/lobby" element={<Lobby/>}/>
              <Route path="/mpg/game" element={<MultiPlayerGame/>}/>
            </Route>
          </Routes>
        </BrowserRouter>
      </ChakraProvider>
    </IntlProvider>
  )
}

