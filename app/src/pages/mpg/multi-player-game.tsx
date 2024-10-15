import React, {useContext} from 'react';
import Page from "../layout/page"
import {Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import WebsocketContext from "../../core/websocket-context"
import {QuestionComponent} from "./play/question"
import {WaitingComponent} from "./play/waiting"
import {ResultsComponent} from "./play/results"


const MultiPlayerGame: React.FC = () => {
  const {question, answer, mpg} = useContext(WebsocketContext)

  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'} noOfLines={1}>
          <FormattedMessage id={'Multi player game'} defaultMessage={'Multi player game'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <>
          {mpg?.ended ? (
            <ResultsComponent/>
          ) : (answer ? (
              <WaitingComponent/>
            ) : question && <QuestionComponent/>
          )}
        </>
      </Page.Body>
    </Page>
  );
};

export default MultiPlayerGame;
