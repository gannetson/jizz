import {Flex, Heading} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {CreateGame} from "./components/create-game"
import {CreatePlayer} from "./components/create-player"
import {useContext} from "react"
import AppContext from "../core/app-context"

const HomePage = () => {
  const {player} = useContext(AppContext);

  return (
    <Page>
      <Page.Header>
        <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
          <FormattedMessage id='welcome' defaultMessage={'Welcome!'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Flex direction={'column'} gap={20}>
          {player ? (
            <CreateGame/>

          ) : (
            <CreatePlayer />
      )}
        </Flex>
      </Page.Body>
    </Page>

  )
};

export default HomePage;