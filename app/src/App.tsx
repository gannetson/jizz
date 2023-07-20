import * as React from "react"
import {ChakraProvider, theme,} from "@chakra-ui/react"
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./pages/layout";
import Home from "./pages/home";
import Country from "./pages/country";

export const App = () => {
  const [level, setLevel] = React.useState<string>('expert')
  return (
  <ChakraProvider theme={theme}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout level={level} setLevel={setLevel}/>}>
          <Route index element={<Home />} />
          <Route path={'/countries/:code'} element={<Country level={level} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ChakraProvider>
  )}

