import React, {FC, ReactNode, useEffect, useState} from 'react';
import AppContext, {Country, Game, Player, Score, Species} from "./app-context";

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

  const playerToken = localStorage.getItem('player-token')
  const gameToken = localStorage.getItem('game-token')

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
          tax_order: taxOrder
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


  return (
    <AppContext.Provider value={{
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