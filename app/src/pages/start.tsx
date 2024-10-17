import {Heading} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {CreateGame} from "../components/create-game"
import {useContext} from "react"
import AppContext from "../core/app-context"
import {Loading} from "../components/loading"

const StartPage = () => {
  const {player, loading} = useContext(AppContext);

  return (
    <Page>
      <Page.Header>
        <Heading textColor={'gray.800'} size={'lg'} m={0} noOfLines={1}>
          {player ? player.name : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
        </Heading>
      </Page.Header>
      <Page.Body>
        {loading ? (
          <Loading/>
        ) : (
          <CreateGame/>
        )}
      </Page.Body>
    </Page>

  )
};

export default StartPage;