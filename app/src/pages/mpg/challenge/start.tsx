import React, {useContext, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {Button, Heading} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import Page from "../../layout/page"
import GameHeader from "../game-header"
import WebsocketContext from "../../../core/websocket-context"
import AppContext from "../../../core/app-context"

export const StartChallenge: React.FC = () => {

  const {players, startGame, question} = useContext(WebsocketContext)
  const {player, game} = useContext(AppContext)
  const navigate = useNavigate()


  useEffect(() => {
    if (question) {
      navigate('/game/play')
    }
  }, [question]);

  return (
    <Page>
      <GameHeader/>
      <Page.Body>
        <Heading size={'lg'}>
          <FormattedMessage id={'game lobby'} defaultMessage={'Game Lobby'}/>
        </Heading>
        <Button colorScheme='orange' onClick={startGame} disabled={!players?.length || players?.length < 2}>
          Start game
        </Button>
      </Page.Body>
    </Page>
  );
};
