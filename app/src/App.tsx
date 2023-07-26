import * as React from "react"
import {ChakraProvider, theme,} from "@chakra-ui/react"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./pages/layout/layout";
import HomePage from "./pages/home";
import CountryPage from "./pages/country";
import {AppContextProvider} from "./core/app-context-provider";

export const App = () => {

  return (
    <AppContextProvider>
      <ChakraProvider theme={theme}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout/>}>
              <Route index element={<HomePage/>}/>
              <Route path={'/countries/'} element={<CountryPage/>}/>
            </Route>
          </Routes>
        </BrowserRouter>
      </ChakraProvider>
    </AppContextProvider>
  )
}

