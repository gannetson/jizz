import React, {FC, ReactNode, useEffect, useState} from 'react';
import {Answer, Country, Game, Player, Species} from "./app-context";
import WebsocketContext, {MultiPlayer} from "./websocket-context"
import {useToast} from "@chakra-ui/react"

type Props = {
  children: ReactNode;
};

const WebsocketContextProvider: FC<Props> = ({children}) => {
  const [mpg, setMpg] = useState<Game | undefined>();
  const [socket, setSocket] = useState<WebSocket | undefined>(undefined);
  const [players, setPlayers] = useState<MultiPlayer[]>([])
  const [player, setPlayer] = useState<Player | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(false)

  const toast = useToast()

  const notify = (title: string, description: string ) => {
     toast({
          title,
          description,
          isClosable: true,
          colorScheme: "orange",
          position: "top",
          duration: 2000
        })
  }
  const startSocket  = ({gameToken, playerToken} : {gameToken: string, playerToken?: string})=> {
     const ws = new WebSocket(`ws://localhost:8050/mpg/${gameToken}`);

      ws.onopen = () => {
        console.log('WebSocket connection established');
        console.log('Joining game')
        playerToken && ws.send(JSON.stringify({ action: 'join_game', player_token: playerToken }))
      };

      ws.onmessage = (event) => {
        console.log('Message from server:', event.data);
        const message = JSON.parse(event.data)
        switch (message.action) {
          case 'update_players':
            const players: MultiPlayer[] = message.players
            setPlayers(players)
            break
          case 'player_joined':
            notify('New player', `${message.player_name} joined the game`)
            break
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
      };

      setSocket(ws);
      return ws

      return () => {
        ws.close();
      };
  }

  const sendAction = (data: {}) => {
    if (socket) {
      socket.send(JSON.stringify(data))
    } else {
      console.log("Error sending action. Socket not ready.")
    }
  }

  const startGame = () => {
    sendAction({ action: 'start_game', player_token: playerToken })
  }

  const joinGame = ({gameToken, playerToken} : {gameToken: string, playerToken: string}) => {
    startSocket({gameToken, playerToken})
  }

  const gameToken = localStorage.getItem('game-token')
  const playerToken = localStorage.getItem('player-token')

  useEffect(() => {
    if (gameToken) {
      setLoading(true)
      fetch(`/api/games/${gameToken}/`, {
        cache: 'no-cache',
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
      .then(response => {
        if (response.status === 200) {
          response.json().then(data => {
            if (data.multiplayer && !socket) {
              startSocket({gameToken})
              setMpg(data)
            }
          })
        } else {
          console.log('Could not load game.')
        }
        setLoading(false)
      })

    }
  }, [gameToken]);

  return (
    <WebsocketContext.Provider value={{
      startSocket,
      socket,
      mpg,
      players,
      setMpg,
      startGame,
      player,
      setPlayer,
      joinGame
    }}>
      {children}
    </WebsocketContext.Provider>
  );
};

export {WebsocketContextProvider};