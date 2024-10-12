import React, {useEffect, useState} from 'react';
import {useNavigate, useParams, useLocation} from 'react-router-dom';
import Page from "../layout/page"
import {Badge, Box, Button, Flex, Heading, Input, List, ListItem, TagLabel} from "@chakra-ui/react"
import {FormattedMessage} from "react-intl"
import copy from "copy-to-clipboard"

interface Player {
  name: string;
}

const Lobby: React.FC = () => {
  const {gameCode} = useParams<{ gameCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const playerName = new URLSearchParams(location.search).get('playerName');
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const socketInstance = new WebSocket(`ws://localhost:8050/ws/quiz/${gameCode}/`);

    socketInstance.onopen = () => {
      // Join the game
      socketInstance.send(JSON.stringify({
        action: 'join_game',
        player_name: playerName
      }));
    };

    socketInstance.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.message) {
        console.log(data.message); // log player joins
      }

      if (data.players) {
        setPlayers(data.players); // assuming server sends player list
      }
    };

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, [gameCode, playerName]);

  const startGame = () => {
    if (socket) {
      socket.send(JSON.stringify({
        action: 'start_game',
      }));
      navigate(`/mpg/game/${gameCode}?playerName=${playerName}`);
    }
  };

  const copyCode = () => {
    if (gameCode) {
      copy(gameCode)
      setCopied(true)
      setTimeout(() => {
        setCopied(false);
      }, 2000);

    }
  }

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
          <Box><Badge onClick={copyCode} fontSize='18px' colorScheme='orange'>{gameCode}</Badge></Box>
          {copied ? <FormattedMessage id={'copied'} defaultMessage={'copied!'}/> : (
            <Button colorScheme='orange' variant='link' onClick={copyCode}>Copy code</Button>
          )}
        </Flex>
        <Box>Players joined</Box>
        <List>
          {players.map((player, index) => (
            <ListItem key={index}>{player.name}</ListItem>
          ))}
        </List>
        <Button colorScheme='orange' onClick={startGame} disabled={players.length < 2}>
          Start game
        </Button>
      </Page.Body>
    </Page>
  );
};

export default Lobby;
