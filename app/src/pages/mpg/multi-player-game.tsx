import React, { useContext } from 'react';
import { Page } from "../../shared/components/layout"
import { Heading } from "@chakra-ui/react"
import { FormattedMessage } from "react-intl"
import WebsocketContext from "../../core/websocket-context"
import { QuestionComponent } from "./play/question"
import { WaitingComponent } from "./play/waiting"
import { ResultsComponent } from "./play/results"
import AppContext from "../../core/app-context"


const MultiPlayerGame: React.FC = () => {
  const { question, answer } = useContext(WebsocketContext)
  const { game } = useContext(AppContext)

  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'}>
          {game?.ended
            ? <FormattedMessage id={'game ended'} defaultMessage={'Game ended'} />
            : <FormattedMessage
              id={'game progress'}
              defaultMessage={'Game -  {current} of {total}'}
              values={{ current: question?.sequence, total: game?.length }}
            />
          }
        </Heading>
      </Page.Header>
      <Page.Body>
        <>
          {game?.ended ? (
            <ResultsComponent />
          ) :  (
            question && <QuestionComponent />
          )}
        </>
      </Page.Body>
    </Page>
  );
};

export default MultiPlayerGame;
