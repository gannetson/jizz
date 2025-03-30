import React, {FC, ReactNode, useEffect, useState} from 'react';
import AppContext, {Answer, Country, CountryChallenge, Game, Player, Question, Score, Species} from "./app-context";
import { useToast } from '@chakra-ui/react';
import { assignUniqueKeysToParts } from 'react-intl/src/utils';

type Props = {
  children: ReactNode;
};

const AppContextProvider: FC<Props> = ({children}) => {
  const [level, setLevel] = useState<string>('advanced');
  const [country, setCountry] = useState<Country>({code: 'NL', name: 'Netherlands'});
  const [language, setLanguage] = useState<'en' | 'nl' | 'la'>('en');
  const [taxOrder, setTaxOrder] = useState<string>('');
  const [loading, setLoading] = useState(false)
  const [length, setLength] = useState<string>('10');
  const [player, setPlayer] = useState<Player | undefined>()
  const [playerName, setPlayerName] = useState<string | undefined>()
  const [multiplayer, setMultiplayer] = useState<string>('1')
  const [mediaType, setMediaType] = useState<string>('images')
  const [species, setSpecies] = useState<Species[]>([])
  const [game, setGame] = useState<Game | undefined>(undefined)
  const [includeRare, setIncludeRare] = useState<boolean>(true)
  const [includeEscapes, setIncludeEscapes] = useState<boolean>(false)
  const [countryChallenge, setCountryChallenge] = useState<CountryChallenge | undefined>(undefined)
  const [challengeQuestion, setChallengeQuestion] = useState<Question | undefined>(undefined)

  const playerToken = localStorage.getItem('player-token')
  const gameToken = localStorage.getItem('game-token')

  const toast = useToast()
  
  const createPlayer = async () => {
    const response = await fetch('/api/player/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playerName,
        language: language
      })
    })
    const data = await response.json();
    if (data) {
      localStorage.setItem('player-token', data.token)
      setPlayer(data)
      return data as Player
    }
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

  const loadPlayer = (playerToken: string) => {
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
    return player

  }

  const updatePlayer = async (playerToken: string) => {
    const response = await fetch(`/api/player/${playerToken}/`, {
      method: 'PATCH',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: playerName,
        language: language
      })
    })
    const data = await response.json();
    if (data) {
      localStorage.setItem('player-token', data.token)
      setPlayer(data)
      return data as Player
    }
    return player

  }

  useEffect(() => {
    if (player && player.language !== language) {
      updatePlayer(player.token)
    }
  }, [language]);


  useEffect(() => {
    if (playerToken && (!player || player.token !== playerToken)) {
      loadPlayer(playerToken)
    }
  }, [playerToken]);


  const createGame = async (myPlayer?: Player) => {
    myPlayer = myPlayer ?? player
    if (!myPlayer) {
      console.log("Can't create game, player is not set.")
      return
    }

    const response = await fetch('/api/games/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Token ${myPlayer.token}`,
        },
        body: JSON.stringify({
          multiplayer: multiplayer === '1',
          country: country.code,
          language: language,
          level: level,
          length: length,
          media: mediaType,
          tax_order: taxOrder,
          include_rare: includeRare,
          include_escapes: includeEscapes
        })
      })
      const data = await response.json();
      if (data) {
        localStorage.setItem('game-token', data.token)
        setGame(data)
        return data as Game
      }

  }

  const loadGame = async (gameCode: string) => {
    setLoading(true)
    const response = await fetch(`/api/games/${gameCode}/`, {
      cache: 'no-cache',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    if (response.status === 200) {
      const data = await response.json()
      setGame(data)
      return data as Game
    } else {
      console.log('Could not load game.')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (gameToken && !game) {
      loadGame(gameToken)
    }
  }, [gameToken]);

  const startCountryChallenge = async (country: Country, player: Player) => {
    setLoading(true);

    try {
      const response = await fetch('/api/country-challenges/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Token ${player.token}`,
        },
        body: JSON.stringify({
          country: country.code,
        })
      })
      const data = await response.json()
      setCountryChallenge(data as CountryChallenge)
    } catch (error) {
      toast({
        title: 'Error starting challenge',
        description: 'Unable to start the challenge. Please try again.',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCountryChallenge = async () => {
    if (!player) {
      console.log('Player is not set.')
      return
    }
    if (!countryChallenge) {
      console.log('No country challenge in progress.')
      return
    }
    const question_id = challengeQuestion?.id
      setLoading(true)
      try {
        const response = await fetch(`/api/country-challenges/${countryChallenge.id}/`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Token ${player.token}`,
          }
        })
        const data = await response.json()
        setCountryChallenge(data as CountryChallenge)
      } catch (error) {
        toast({
          title: 'Error loading challenge',
          description: 'Please start a new countr challenge.',
          status: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
  

  const selectChallengeAnswer = async (answer: Species) => {
    if (!player) {
      console.log('Player is not set.')
      return
    }
    const question_id = challengeQuestion?.id
    const answer_id = answer.id

    if (!question_id || !answer_id) {
      console.log('Question or answer is not set.')
      return
    }

    const response = await fetch(`/api/answer/`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Token ${player.token}`,
      },
      body: JSON.stringify({
        question_id: question_id,
        answer_id: answer_id,
        player_token: player.token,
      })
    })
    const data = await response.json()
    loadCountryChallenge()
    getNewChallengeQuestion()

  }

  const getNewChallengLevel = async () => {
    if (!player) {
      console.log('Player is not set.')
      return
    }
    if (!countryChallenge) {
      console.log('No country challenge set.')
      return
    }
    const response = await fetch(`/api/challenge/${countryChallenge.id}/next-level`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Token ${player.token}`,
      },
    })
    loadCountryChallenge()

  }


  const getNewChallengeQuestion = async () => {
    const gameToken = countryChallenge?.levels[0].game.token
    const response = await fetch(`/api/games/${gameToken}/question`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
    console.log('response', response)
    const data = await response.json()
    if (response.status === 200) {
      setChallengeQuestion(data as Question)
    } else (
      console.log(response)
    ) 

  }

  return (
    <AppContext.Provider value={{
      includeEscapes,
      setIncludeEscapes,
      includeRare,
      setIncludeRare,
      level,
      setLevel,
      taxOrder,
      setTaxOrder,
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
      createPlayer,
      createGame,
      loadGame,
      game,
      setGame,
      startCountryChallenge,
      countryChallenge,
      selectChallengeAnswer,
      challengeQuestion,
      getNewChallengeQuestion,
      getNewChallengLevel,
      playerName,
      setPlayerName,
      species,
      loading,
      setLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export {AppContextProvider};