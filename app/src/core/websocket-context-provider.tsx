import React, {FC, ReactNode, useContext, useEffect, useRef, useState} from 'react';
import AppContext, {Answer, Game, MultiPlayer, Player, Question, Species} from "./app-context";
import WebsocketContext from "./websocket-context"
import {useToast} from "@chakra-ui/react"

type Props = {
  children: ReactNode;
};

const WebsocketContextProvider: FC<Props> = ({children}) => {
  const [socket, setSocket] = useState<WebSocket | undefined>(undefined);
  const [players, setPlayers] = useState<MultiPlayer[]>([])
  const [question, setQuestion] = useState<Question | undefined>(undefined)
  const [answer, setAnswer] = useState<Answer | undefined>(undefined)

  const retryInterval = useRef<number>(1000);
  const maxRetries = useRef<number>(100);
  const retries = useRef<number>(0);

  const toast = useToast()

  const {game, setGame, player} = useContext(AppContext)

  const gameToken = localStorage.getItem('game-token')
  const playerToken = localStorage.getItem('player-token')


  const notify = (title: string, description?: string, colorScheme?: string) => {
    toast({
      title,
      description,
      isClosable: true,
      colorScheme: colorScheme || "orange",
      position: "bottom",
      duration: 2000
    })
  }

  const connectSocket = (game?: Game, player?: Player) => {
    if (!player) {
      console.log("Couldn't connect to game. No player token")
      return
    }
    if (!game) {
      console.log("Couldn't connect to game. No game token")
      return
    }

    let socketUrl = `wss://birdr.pro/mpg/${game.token}`
    if (window.location.host === 'localhost:3000') {
      socketUrl = `ws://localhost:8050/mpg/${game.token}`
    }
    const ws = new WebSocket(socketUrl);


    ws.onopen = () => {
      console.log('WebSocket connection established');
      console.log('Joining game')
      ws.send(JSON.stringify({action: 'join_game', player_token: player.token}))
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('Message from server:', message.action);
      switch (message.action) {
        case 'update_players':
          const players: MultiPlayer[] = message.players
          setPlayers(players)
          break
        case 'player_joined':
          console.log(`${message.player_name} joined the game`)
          break
        case 'new_question':
          setAnswer(undefined)
          const question: Question = message.question
          setQuestion(question)
          break
        case 'game_started':
          notify('Game started')
          break
        case 'game_updated':
          setGame(message.game as Game)
          break
        case 'answer_checked':
          setAnswer(message.answer as Answer)
          if (message.answer.correct) {
            notify('Correct!', undefined, 'green')
          } else {
            notify('Incorrect!', undefined, 'red')
          }
          break
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');

      if (retries.current < maxRetries.current) {
        retries.current++;
        console.log(`Reconnecting... (${retries.current}/${maxRetries.current})`);
        setTimeout(connectSocket, retryInterval.current);
      } else {
        console.log('Max retries reached. Could not reconnect.');
      }
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
    sendAction({action: 'start_game', player_token: player?.token})
  }


  const nextQuestion = () => {
    sendAction({action: 'next_question', player_token: player?.token})
  }

  const joinGame = (game?: Game, player?: Player) => {
    socket && socket.close()
    setQuestion(undefined)
    setAnswer(undefined)
    connectSocket(game, player)
  }

  const submitAnswer = (answer: Answer) => {
    sendAction({
      action: 'submit_answer',
      player_token: answer.player?.token,
      question_id: answer.question?.id,
      answer_id: answer.answer?.id
    })
  }
  useEffect(() => {
    if (game?.token && !socket && player?.token) {
      joinGame(game, player)
    }
  }, [game?.token]);

  return (
    <WebsocketContext.Provider value={{
      players,
      startGame,
      nextQuestion,
      question,
      joinGame,
      submitAnswer,
      answer
    }}>
      {children}
    </WebsocketContext.Provider>
  );
};

export {WebsocketContextProvider};