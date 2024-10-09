import React, {FC, ReactNode, useCallback, useEffect, useState} from 'react';
import AppContext, {Game, Country, Question, Species, Language, Player} from "./app-context";

type Props = {
  children: ReactNode;
};


const AppContextProvider: FC<Props> = ({children}) => {
  const [level, setLevel] = useState<string>('advanced');
  const [game, setGame] = useState<Game | undefined>();
  const [country, setCountry] = useState<Country | undefined>();
  const [language, setLanguage] = useState<string | undefined>('en');
  const [loading, setLoading] = useState(false)
  const [species, setSpecies] = useState<Species | undefined>();
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


  const commitAnswer = async (answer: Answer) => {
    await fetch(`/api/answer/${question.id}/`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(answer)
    })
  }



  */

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
            response.json().then(data => { setGame(data)})
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
            response.json().then(data => { setPlayer(data)})
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
      loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export {AppContextProvider};