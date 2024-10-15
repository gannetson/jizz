import React, {FC, ReactNode, useCallback, useContext, useEffect, useState} from 'react';
import AppContext, {Game, Country, Question, Species, Language, Player, Answer} from "./app-context";

type Props = {
  children: ReactNode;
};

const AppContextProvider: FC<Props> = ({children}) => {
  const [level, setLevel] = useState<string>('advanced');
  const [game, setGame] = useState<Game | undefined>();
  const [answer, setAnswer] = useState<Answer | undefined>();
  const [country, setCountry] = useState<Country | undefined>();
  const [language, setLanguage] = useState<'en' | 'nl'>('en');
  const [loading, setLoading] = useState(false)
  const [length, setLength] = useState<string>('10');
  const [player, setPlayer] = useState<Player | undefined>()
  const [multiplayer, setMultiplayer] = useState<string>('1')
  const [mediaType, setMediaType] = useState<string>('images')
  const [species, setSpecies] = useState<Species[]>([])


  const gameToken = localStorage.getItem('game-token')
  const playerToken = localStorage.getItem('player-token')

  const reloadAnswer = async (givenAnswer: Answer) => {
    await fetch(`/api/answer/${givenAnswer.question?.id}/${playerToken}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    }).then(response => {
      if (response.status === 200) {
        response.json().then(data => {
          setAnswer(data)
        })
      } else {
        console.log('Could not load answer.')
      }
      setLoading(false)
    })
  }


  const commitAnswer = async (givenAnswer: Answer) => {
    await fetch(`/api/answer/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question_id: givenAnswer.question?.id,
        answer_id: givenAnswer.answer?.id,
        player_token: playerToken
      })
    }).then(response => {
      if (response.status === 201) {
        response.json().then(data => {
          setAnswer(data)
        })
      } else if (response.status === 500) {
        // Already answered, reload first answer
        reloadAnswer(givenAnswer)
      } else {
        console.log('Could not save answer.')
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    if (country?.code) {
      setLoading(true)
      fetch(`/api/species/?countryspecies__country=${country.code}`, {
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
  }, [country?.code]);

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
            if (!data.multiplayer) {
              setGame(data)
            }
          })
        } else {
          console.log('Could not load game.')
        }
        setLoading(false)
      })

    }
  }, [gameToken]);


  const reloadGame = async () => {
    await fetch(`/api/games/${game?.token}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    }).then(response => {
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


  const getNextQuestion = async () => {
    setLoading(true)
    setAnswer(undefined)
    await reloadGame()
    setLoading(false)
  }

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
      mediaType,
      setMediaType,
      player,
      setPlayer,
      game,
      setGame,
      getNextQuestion,
      species,
      loading,
      commitAnswer,
      answer

    }}>
      {children}
    </AppContext.Provider>
  );
};

export {AppContextProvider};