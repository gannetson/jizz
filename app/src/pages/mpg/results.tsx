import React, {useContext} from 'react';
import Page from "../layout/page"
import {Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import WebsocketContext from "../../core/websocket-context"
import {QuestionComponent} from "./play/question"
import {WaitingComponent} from "./play/waiting"
import {ResultsComponent} from "./play/results"


const GameEnded: React.FC = () => {

  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'} noOfLines={1}>
          <FormattedMessage id={'game ended'} defaultMessage={'Game ended'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <ResultsComponent/>
      </Page.Body>
    </Page>
  );
};

export default GameEnded;
