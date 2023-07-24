import * as React from "react"
import {ChakraProvider, theme,} from "@chakra-ui/react"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout, {Country} from "./pages/layout/layout";
import HomePage from "./pages/home";
import CountryPage from "./pages/country";

export const App = () => {
  const [level, setLevel] = React.useState<string>('expert')
  const [country, setCountry] = React.useState<Country>()

  return (
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/"
                 element={<Layout
                   level={level}
                   setLevel={setLevel}
                   country={country}
                   setCountry={setCountry}/>}>
            <Route index element={<HomePage/>}/>
            <Route path={'/countries/'}
                   element={<CountryPage
                     level={level}
                     country={country}
                     setCountry={setCountry}/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  )
}

