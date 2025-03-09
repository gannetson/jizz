import {Heading} from "@chakra-ui/react";
import Page from "./layout/page";
import {FormattedMessage} from "react-intl";
import {useContext} from "react"
import AppContext from "../core/app-context"
import {Loading} from "../components/loading"
import {CreateCountryChallenge} from "../components/create-country-challenge"
import { StartLevel } from "./mpg/challenge/start";
import { ChallengeQuestion } from "./mpg/challenge/question";

export const ChallengePage = () => {
  const {player, loading, countryChallenge} = useContext(AppContext);

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
          countryChallenge ? (
            countryChallenge.levels[0].status === 'new' ? (
              <StartLevel/>
            ) : (
              <ChallengeQuestion />
            )
          ) : (
            <CreateCountryChallenge/>
          )
        )}
      </Page.Body>
    </Page>

  )
};
