import React, {FC, ReactNode, useCallback, useEffect, useState} from 'react';
import AppContext, {Game, Country, Question, Species, Language, Player, Answer} from "./app-context";

type Props = {
  children: ReactNode;
};


const AppContextProvider: FC<Props> = ({children}) => {
  const [level, setLevel] = useState<string>('advanced');
  const [game, setGame] = useState<Game | undefined>();
  const [country, setCountry] = useState<Country | undefined>();
  const [language, setLanguage] = useState<string | undefined>('en');
  const [loading, setLoading] = useState(false)
  const [length, setLength] = useState<string>('10');
  const [player, setPlayer] = useState<Player | undefined>()
  const [multiplayer, setMultiplayer] = useState<string>('0')


  /*
    const fetchSpecies = useCallback(async (species:Species) => {
      try {
        const response = await fetch(`/api/species/${species.id}&format=json`)
        const data = await response.json();
        setSpecies(data);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    }, [])


    if (!game && !gameToken && document.location.pathname === '/game') {
      document.location.href = '/'
    }

    if (game) {
      game.correct = game?.questions.filter((q)=> q.correct).length
    }
    */

  const gameToken = localStorage.getItem('game-token')
  const playerToken = localStorage.getItem('player-token')

  const commitAnswer = async (answer: Answer) => {
    await fetch(`/api/answer/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question_id: answer.question.id,
        answer_id: answer.answer.id,
        player_token: playerToken
      })
    })
  }

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
              setGame(data)
            })
          } else {
            console.log('Could not load game.')
          }
          setLoading(false)
        })

    }
  }, [gameToken]);

  useEffect(() => {
    if (playerToken) {
      setLoading(true)
      fetch(`/api/player/${playerToken}/`, {
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
              setPlayer(data)
            })
          } else {
            console.log('Could not load player.')
          }
          setLoading(false)
        })

    }
  }, [playerToken]);


  return (
    <AppContext.Provider value={{
      level,
      setLevel,
      length,
      setLength,
      country,
      setCountry,
      language,
      setLanguage,
      multiplayer,
      setMultiplayer,
      player,
      setPlayer,
      game,
      setGame,
      loading,
      commitAnswer
    }}>
      {children}
    </AppContext.Provider>
  );
};

export {AppContextProvider};