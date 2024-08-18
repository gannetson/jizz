import * as React from "react"
import {useEffect} from "react"
import {ChakraProvider, theme,} from "@chakra-ui/react"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./pages/layout/layout";
import HomePage from "./pages/home";
import {AppContextProvider} from "./core/app-context-provider";
import GamePage from "./pages/game";

export const App = () => {
  useEffect(() => {
     document.title = "Jizz"
  }, []);

  return (
    <AppContextProvider>
      <ChakraProvider theme={theme}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout/>}>
              <Route index element={<HomePage/>}/>
              <Route path={'/game/'} element={<GamePage/>}/>
            </Route>
          </Routes>
        </BrowserRouter>
      </ChakraProvider>
    </AppContextProvider>
  )
}

