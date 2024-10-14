import React, {useContext, useState} from 'react';
import Page from "../layout/page"
import {Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import WebsocketContext from "../../core/websocket-context"
import AppContext from "../../core/app-context"
import {QuestionComponent} from "./play/question"


const MultiPlayerGame: React.FC = () => {


  const [copied, setCopied] = useState(false)
  const {players, startGame, question} = useContext(WebsocketContext)
  const {player} = useContext(AppContext)

  console.log('Yeah')

  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'} noOfLines={1}>
          <FormattedMessage id={'Multi player game'} defaultMessage={'Multi player game'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Heading variant={'h3'}>Question</Heading>
        <QuestionComponent />
      </Page.Body>
    </Page>
  );
};

export default MultiPlayerGame;
