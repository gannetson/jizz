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
import Start from "./pages/start"
import JoinPage from "./pages/join"
import StartPage from "./pages/start"
import {ResultsComponent} from "./pages/mpg/play/results"


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
              <Route path='/start/' element={<StartPage />}/>
              <Route path='/join/' element={<JoinPage />}/>
              <Route path="/join/:gameCode" element={<JoinGame/>}/>
              <Route path='/about/' element={<AboutPage/>}/>

              <Route path="/game/join/:gameCode" element={<JoinGame/>}/>
              <Route path="/game/lobby" element={<Lobby/>}/>
              <Route path="/game/play" element={<MultiPlayerGame/>}/>
            </Route>
          </Routes>
        </BrowserRouter>
      </ChakraProvider>
    </IntlProvider>
  )
}

