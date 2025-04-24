import * as React from "react"
import {useContext, useEffect} from "react"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./pages/layout/layout";
import HomePage from "./pages/home";
import Lobby from "./pages/mpg/lobby"
import {AboutPage} from "./pages/about";
import {IntlProvider} from "react-intl";

import enMessages from './locales/en.json';
import nlMessages from './locales/nl.json';
import laMessages from './locales/la.json';
import MultiPlayerGame from "./pages/mpg/multi-player-game"
import AppContext from "./core/app-context"
import StartPage from "./pages/start"
import JoinPage from "./pages/join"
import GameEnded from "./pages/mpg/results"
import Hiscores from "./pages/hiscores"
import {ChallengePage} from "./pages/challenge"
import Updates from "./pages/updates"
import {Login} from "./components/auth/login"
import {AuthCallback} from "./components/auth/auth-callback"
import {PrivacyPage} from "./pages/privacy"
import { ChallengeQuestion } from "./pages/mpg/challenge/question";


export const MainContent = () => {
  useEffect(() => {
    document.title = "Birdr"

  }, []);
  const {language} = useContext(AppContext)


  const messages = {
    en: enMessages,
    nl: nlMessages,
    la: laMessages
  }

  return (
    <IntlProvider locale={language as 'en' | 'nl'} messages={messages[language as 'en' | 'nl']}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout/>}>
            <Route index element={<HomePage/>}/>
            <Route path="/login" element={<Login />} />
            <Route path="/login/:provider" element={<AuthCallback />} />
            <Route path='/start/' element={<StartPage />}/>
            <Route path='/join/' element={<JoinPage />}/>
            <Route path="/join/:gameCode" element={<JoinPage/>}/>
            <Route path='/about/' element={<AboutPage/>}/>
            <Route path='/privacy/' element={<PrivacyPage/>}/>
            <Route path='/challenge/' element={<ChallengePage />}/>
            <Route path='/challenge/play' element={<ChallengeQuestion />}/>

            <Route path="/game/lobby" element={<Lobby/>}/>
            <Route path="/game/play" element={<MultiPlayerGame/>}/>
            <Route path="/game/ended" element={<GameEnded/>}/>

            <Route path='/scores/' element={<Hiscores />}/>
            <Route path='/updates/' element={<Updates />}/>

          </Route>
        </Routes>
      </BrowserRouter>
    </IntlProvider>
  )
}

