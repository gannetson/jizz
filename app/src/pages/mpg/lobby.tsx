import React, {useContext, useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Page from "../layout/page"
import {Box, Button, Flex, Heading, List, ListItem, Tag} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import copy from "copy-to-clipboard"
import WebsocketContext from "../../core/websocket-context"
import AppContext from "../../core/app-context"
import {PlayerItem} from "./play/player-item"
import GameHeader from "./game-header"

const Lobby: React.FC = () => {

  const gameToken = localStorage.getItem('game-token')

  const [copied, setCopied] = useState(false)
  const [copied2, setCopied2] = useState(false)
  const {players, startGame, question} = useContext(WebsocketContext)
  const {player, game} = useContext(AppContext)
  const navigate = useNavigate()

  const gameLink = `https://birdr.pro/join/${gameToken}`

  const copyCode = () => {
    if (gameToken) {
      copy(gameToken)
      setCopied(true)
      setTimeout(() => {
        setCopied(false);
      }, 2000);

    }
  }

  const copyLink = () => {
    if (gameLink) {
      copy(gameLink)
      setCopied2(true)
      setTimeout(() => {
        setCopied2(false);
      }, 2000);

    }

  }

  useEffect(() => {
    if (question) {
      navigate('/game/play')
    }
  }, [question]);

  const isHost = player?.name === game?.host?.name
  console.log('player', player)
  console.log('game', game)
  console.log('isHost', isHost)

  return (
    <Page>
      <GameHeader/>
      <Page.Body>
        <Heading size={'lg'}>
          <FormattedMessage id={'game lobby'} defaultMessage={'Game Lobby'}/>
        </Heading>
        <Flex gap={4}>
          <FormattedMessage id={'code'} defaultMessage={'Code'}/>
          <Box><Tag onClick={copyCode} fontSize='18px'>{gameToken}</Tag></Box>
          {copied ? <FormattedMessage id={'copied'} defaultMessage={'copied!'}/> : (
            <Button variant='link' onClick={copyCode}>
              <FormattedMessage id={'copy'} defaultMessage={'copy'}/>
            </Button>
          )}
        </Flex>
        <Flex gap={4}>
          <FormattedMessage id={'link'} defaultMessage={'Link'}/>
          <Box><Tag onClick={copyLink} fontSize='18px'>{gameLink}</Tag></Box>
          {copied2 ? <FormattedMessage id={'copied'} defaultMessage={'copied!'}/> : (
            <Button variant='link' onClick={copyLink}>
              <FormattedMessage id={'copy'} defaultMessage={'copy'}/>
            </Button>
          )}
        </Flex>
        <Heading size={'md'} mt={6}>
          <FormattedMessage id={'players joined'} defaultMessage={'Players joined'}/>
        </Heading>
        <List spacing={4}>
          {players && players.map((player, index) => (
            <ListItem key={index}>
              <PlayerItem showAnswer={false} showScore={false} showRanking={false} player={player}/>
            </ListItem>
          ))}
        </List>
        {
          isHost ? (
            <Button onClick={startGame}>
              Start game
            </Button>

          ) : (
            <FormattedMessage id={'waiting for host'} defaultMessage={'Waiting until the {host} starts the game.'}
                              values={{host: game?.host?.name || 'host'}}/>
          )
        }

        <Heading size={'md'} mt={6}>
          <FormattedMessage id={'High score'} defaultMessage={'High score'}/>
        </Heading>
        {game?.current_highscore ? (
          <PlayerItem variant="outline" showAnswer={false} showScore={true} player={game?.current_highscore}/>

        ) : (
          <FormattedMessage id={'no high score'} defaultMessage={'No high score yet.'}/>
        )}
      </Page.Body>
    </Page>
  );
};

export default Lobby;
