import React, {useContext} from 'react';
import Page from "../layout/page"
import {Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import WebsocketContext from "../../core/websocket-context"
import {QuestionComponent} from "./play/question"
import {WaitingComponent} from "./play/waiting"


const MultiPlayerGame: React.FC = () => {
  const {players, startGame, question, answer} = useContext(WebsocketContext)

  console.log(answer)

  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'} noOfLines={1}>
          <FormattedMessage id={'Multi player game'} defaultMessage={'Multi player game'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Heading variant={'h3'}>Question</Heading>
        {answer ? (
          <WaitingComponent />
        ) : question && <QuestionComponent />}

      </Page.Body>
    </Page>
  );
};

export default MultiPlayerGame;
