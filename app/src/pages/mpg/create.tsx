import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Page from "../layout/page"
import {Button, Heading, Input} from "@chakra-ui/react"

const CreateGame: React.FC = () => {
  const [playerName, setPlayerName] = useState<string>('');
  const navigate = useNavigate();

  const createGame = async () => {
    // Generate a random game code
    const gameCode = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 8)

    // Open a WebSocket connection and send create_game action
    const socket = new WebSocket(`ws://localhost:8050/ws/quiz/${gameCode}/`);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        action: 'create_game',
        player_name: playerName
      }));
      navigate(`/mpg/lobby/${gameCode}?playerName=${playerName}`);
    };


    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
  };

  return (
    <Page>
      <Page.Body>
        <Heading variant={'h3'}>Create a New Game</Heading>
        <Input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name"
        />
        <Button colorScheme='orange' onClick={createGame} isDisabled={!playerName}>
          Create Game
        </Button>
      </Page.Body>
    </Page>
  );
};

export default CreateGame;
