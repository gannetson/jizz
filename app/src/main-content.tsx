import * as React from "react"
import {useContext, useEffect} from "react"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import { Layout } from "./shared/components/layout";
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
import {AuthLoginRedirect} from "./components/auth/auth-login-redirect"
import {PrivacyPage} from "./pages/privacy"
import {ProfilePage} from "./pages/profile"
import { ForgotPasswordPage } from "./pages/forgot-password";
import { ResetPasswordPage } from "./pages/reset-password";
import { ChallengeQuestion } from "./pages/mpg/challenge/question";
import TexelStartPage from "./pages/texel/start"
import TexelHiscorePage from "./pages/texel/hiscores"
import { MyGamesPage } from "./pages/my-games"
import { GameDetailPage } from "./pages/game-detail"
import { MediaReviewPage } from "./pages/media-review"
import { HelpOverviewPage, HelpPageDetail } from "./pages/help"


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
  const locale  = language === 'nl' ? 'nl' : language === 'la' ? 'la' : language === 'en_US' ? 'en' : 'en';

  return (
    <IntlProvider locale={locale} messages={messages[locale]}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout/>}>
            <Route index element={<HomePage/>}/>
            <Route path="/login" element={<Login />} />
            <Route path="/login/:provider" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<ProfilePage />} />
            <Route path="/my-games" element={<MyGamesPage />} />
            <Route path="/my-games/:token" element={<GameDetailPage />} />
            <Route path='/start/' element={<StartPage />}/>
            <Route path='/join/' element={<JoinPage />}/>
            <Route path="/join/:gameCode" element={<JoinPage/>}/>
            <Route path='/about/' element={<AboutPage/>}/>
            <Route path='/privacy/' element={<PrivacyPage/>}/>
            <Route path='/challenge/' element={<ChallengePage />}/>
            <Route path='/challenge/play' element={<ChallengeQuestion />}/>

            <Route path='/texel/start/' element={<TexelStartPage />}/>
            <Route path='/texel/scores/' element={<TexelHiscorePage />}/>

            <Route path="/game/lobby" element={<Lobby/>}/>
            <Route path="/game/play" element={<MultiPlayerGame/>}/>
            <Route path="/game/ended" element={<GameEnded/>}/>

            <Route path='/scores/' element={<Hiscores />}/>
            <Route path='/updates/' element={<Updates />}/>
            <Route path='/help' element={<HelpOverviewPage />}/>
            <Route path='/help/:slug' element={<HelpPageDetail />}/>
            <Route path='/media-review/' element={<MediaReviewPage />}/>
            <Route path='/media-review/:countryCode' element={<MediaReviewPage />}/>

          </Route>
        </Routes>
      </BrowserRouter>
    </IntlProvider>
  )
}

