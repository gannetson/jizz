import {Heading} from "@chakra-ui/react";
import { Page } from "../shared/components/layout";
import {FormattedMessage} from "react-intl";
import {useContext} from "react"
import AppContext from "../core/app-context"
import {Loading} from "../components/loading"
import {CreateCountryChallenge} from "../components/create-country-challenge"
import { StartLevel } from "./mpg/challenge/start";
import { ChallengeQuestion } from "./mpg/challenge/question";
import { FailedLevel } from "./mpg/challenge/failed";
import { PassedLevel } from "./mpg/challenge/passed";

export const ChallengePage = () => {
  const {player, loading, countryChallenge} = useContext(AppContext);

  let body = <CreateCountryChallenge/>
  const status = countryChallenge?.levels?.[0]?.status
  switch(status) {
    case 'new':
      body = <StartLevel/>
      break;
    case 'failed':
      body = <FailedLevel/>
      break;
    case 'passed':
      body = <PassedLevel/>
      break;
  }

  return (
    <Page>
      <Page.Header>
        <Heading color={'gray.800'} size={'lg'} m={0}>
          {player ? player.name : <FormattedMessage id='welcome' defaultMessage={'Welcome'}/>}
        </Heading>
      </Page.Header>
      <Page.Body>
        {loading ? (
          <Loading/>
        ) : (
          body
        )}
      </Page.Body>
    </Page>

  )
};
