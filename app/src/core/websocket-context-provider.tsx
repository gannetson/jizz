import React, {FC, ReactNode, useEffect, useState} from 'react';
import {Answer, Game, Player, Question, Species} from "./app-context";
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
  const [question, setQuestion] = useState<Question | undefined>(undefined)
  const [answer, setAnswer] = useState<Answer | undefined>(undefined)
  const [species, setSpecies] = useState<Species[]>([])


  const toast = useToast()

    useEffect(() => {
    if (mpg?.country?.code) {
      setLoading(true)
      fetch(`/api/species/?countryspecies__country=${mpg.country.code}`, {
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
            setSpecies(data)
          })
        } else {
          console.log('Could not load country species.')
        }
        setLoading(false)
      })

    }
  }, [mpg?.country?.code]);

  const notify = (title: string, description?: string ) => {
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
    let socketUrl = `wss://jizz.be/mpg/${gameToken}`
    if (window.location.host === 'localhost:3000') {
      socketUrl = `ws://localhost:8050/mpg/${gameToken}`
    }
    const ws = new WebSocket(socketUrl);



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
          case 'new_question':
            setAnswer(undefined)
            console.log('New question')
            const question: Question = message.question
            setQuestion(question)
            break
          case 'game_started':
            notify('Game started')
            break
          case 'game_updated':
            setMpg(message.game as Game)
            break
          case 'answer_checked':
            setAnswer(message.answer as Answer)
            if (message.answer.correct) {
              notify('Correct!')
            } else {
              notify('Incorrect!')
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


  const nextQuestion = () => {
    sendAction({ action: 'next_question', player_token: playerToken })
  }

  const joinGame = ({gameToken, playerToken} : {gameToken: string, playerToken: string}) => {
    setQuestion(undefined)
    setAnswer(undefined)
    startSocket({gameToken, playerToken})
  }

  const submitAnswer = (answer: Answer) => {
    sendAction({ action: 'submit_answer', player_token: answer.player?.token, question_id: answer.question?.id, answer_id: answer.answer?.id })
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
      loading,
      startSocket,
      socket,
      mpg,
      players,
      setMpg,
      startGame,
      nextQuestion,
      species,
      question,
      player,
      setPlayer,
      joinGame,
      submitAnswer,
      answer
    }}>
      {children}
    </WebsocketContext.Provider>
  );
};

export {WebsocketContextProvider};