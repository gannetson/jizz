import React, {useContext, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Page from "../layout/page"
import {Badge, Box, Button, Flex, Heading, List, ListItem} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import copy from "copy-to-clipboard"
import WebsocketContext from "../../core/websocket-context"
import AppContext from "../../core/app-context"
import {PlayerItem} from "./play/player-item"

interface Player {
  name: string;
}

const Lobby: React.FC = () => {

  const gameToken = localStorage.getItem('game-token')

  const [copied, setCopied] = useState(false)
  const {players, startGame, question} = useContext(WebsocketContext)
  const {player} = useContext(AppContext)
  const navigate = useNavigate()

  const copyCode = () => {
    if (gameToken) {
      copy(gameToken)
      setCopied(true)
      setTimeout(() => {
        setCopied(false);
      }, 2000);

    }
  }

  useEffect(() => {
    if (question) {
      navigate('/mpg/game')
    }
  }, [question]);

  console.log('Q', question)

  return (
    <Page>
      <Page.Header>
        <Heading size={'lg'} noOfLines={1}>
          <FormattedMessage id={'Multi player game'} defaultMessage={'Multi player game'}/>
        </Heading>
      </Page.Header>
      <Page.Body>
        <Heading variant={'h3'}>Game Lobby</Heading>
        <Flex gap={4}>
          Game Code:
          <Box><Badge onClick={copyCode} fontSize='18px' colorScheme='orange'>{gameToken}</Badge></Box>
          {copied ? <FormattedMessage id={'copied'} defaultMessage={'copied!'}/> : (
            <Button colorScheme='orange' variant='link' onClick={copyCode}>Copy code</Button>
          )}
        </Flex>
        <Box>Players joined</Box>
        <List spacing={4}>
          {players && players.map((player, index) => (
            <ListItem key={index}>
              <PlayerItem player={player}/>
            </ListItem>
          ))}
        </List>
        {
          player && player.is_host ? (
            <Button colorScheme='orange' onClick={startGame} disabled={!players?.length || players?.length < 2}>
              Start game
            </Button>

          ) : (
            <FormattedMessage id={'waiting for host'} defaultMessage={'Waiting until the host starts the game.'} />
          )
        }
      </Page.Body>
    </Page>
  );
};

export default Lobby;
