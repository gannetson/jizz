import React, {FC, ReactNode, useEffect, useState, useCallback} from 'react';
import AppContext, {Answer, Country, CountryChallenge, Game, Player, Question, Score, Species} from "./app-context";
import { toaster } from "@/components/ui/toaster";
import { assignUniqueKeysToParts } from 'react-intl/src/utils';
import {TaxOrder} from "../user/use-tax-order"
import {TaxFamily} from "../user/use-tax-family"
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios-config';
import { apiUrl } from '../api/baseUrl';
import { authService } from '../api/services/auth.service';
import { profileService, UserProfile } from '../api/services/profile.service';

type Props = {
  children: ReactNode;
};

const AppContextProvider: FC<Props> = ({children}) => {
  const [level, setLevel] = useState<string>('advanced');
  const [country, setCountry] = useState<Country>({code: 'NL', name: 'Netherlands'});
  const [language, setLanguage] = useState<string>('en');
  const [taxOrder, setTaxOrder] = useState<TaxOrder | undefined>();
  const [taxFamily, setTaxFamily] = useState<TaxFamily | undefined>();
  const [loading, setLoading] = useState(false)
  const [length, setLength] = useState<string>('10');
  const [player, setPlayer] = useState<Player | undefined>()
  const [playerName, setPlayerName] = useState<string | undefined>()
  const [multiplayer, setMultiplayer] = useState<string>('1')
  const [mediaType, setMediaType] = useState<string>('images')
  const [soundsScope, setSoundsScope] = useState<'all' | 'passerines'>('all')
  const [species, setSpecies] = useState<Species[]>([])
  const [game, setGame] = useState<Game | undefined>(undefined)
  const [includeRare, setIncludeRare] = useState<boolean>(true)
  const [includeEscapes, setIncludeEscapes] = useState<boolean>(false)
  const [countryChallenge, setCountryChallenge] = useState<CountryChallenge | undefined>(undefined)
  const [challengeQuestion, setChallengeQuestion] = useState<Question | undefined>(undefined)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  const playerToken = localStorage.getItem('player-token')
  const gameToken = localStorage.getItem('game-token')
  
  const noCacheHeaders = React.useMemo(() => ({
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }), [])

  const createPlayer = async () => {
    // Use axios to automatically include JWT token via interceptors
    const response = await axios.post('/api/player/', {
      name: playerName,
      language: language
    }, {
      headers: {
        ...noCacheHeaders,
      }
    });
    const data = response.data;
    if (data) {
      localStorage.setItem('player-token', data.token)
      setPlayer(data)
      return data as Player
    }
  }

  // Load profile when authenticated (for species language preference)
  useEffect(() => {
    if (authService.getAccessToken()) {
      profileService.getProfile()
        .then(setProfile)
        .catch(() => setProfile(null));
    } else {
      setProfile(null);
    }
  }, []);

  const speciesLanguage = profile?.language ?? language ?? 'en';

  useEffect(() => {
    if (country?.code) {
      setLoading(true)
      fetch(apiUrl(`/api/species/?countryspecies__country=${country.code}&language=${speciesLanguage}`), {
        cache: 'no-cache',
        method: 'GET',
        headers: {
          ...noCacheHeaders,
        },
      })
      .then(response => {
        if (response.status === 200) {
          response.json().then(data => {
            // Ensure data is always an array (handle paginated responses or other formats)
            const speciesArray = Array.isArray(data) ? data : (data?.results || data?.data || [])
            setSpecies(speciesArray)
          })
        } else {
          console.log('Could not load country species.')
          setSpecies([]) // Ensure it's always an array even on error
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Error loading species:', error)
        setSpecies([]) // Ensure it's always an array on error
        setLoading(false)
      })

    }
  }, [country?.code, speciesLanguage]);

  const loadPlayer = async (playerToken: string) => {
    setLoading(true)
    const response = await fetch(apiUrl(`/api/player/${playerToken}/`), {
      cache: 'no-store',
      method: 'GET',
      headers: {
        ...noCacheHeaders,
        'Authorization': `Token ${playerToken}`
      }
    })
    const data = await response.json()
    if (response.status !== 200) {
      setLoading(false)
      localStorage.removeItem('player-token')
      console.log('Could not load player.', response.status, data);
      window.location.reload();
    }
    if (data) {
      setLanguage(data.language)
      setPlayer(data)
      setLoading(false)
      return data as Player
    } else {
      console.log('Could not load player.')
      setLoading(false)
      return undefined
    }
  }

  const updatePlayer = useCallback(async (playerToken: string) => {
    const response = await fetch(apiUrl(`/api/player/${playerToken}/`), {
      cache: 'no-store',
      method: 'PATCH',
      headers: {
        ...noCacheHeaders,
        'Authorization': `Token ${playerToken}`
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
  }, [playerName, language, noCacheHeaders]);

  useEffect(() => {
    if (player && player.language !== language && player.token) {
      updatePlayer(player.token)
    }
  }, [language, player?.token, player?.language, updatePlayer]);


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

    // Clear old game state before creating a new game
    // This prevents issues with old game data persisting
    const oldGameToken = localStorage.getItem('game-token')
    if (oldGameToken) {
      // Remove old game token from localStorage
      localStorage.removeItem('game-token')
    }
    // Clear game state - this will trigger WebSocket disconnection
    // Use a small delay to ensure state clears before creating new game
    setGame(undefined)
    
    // Wait a tick to ensure state is cleared and WebSocket disconnects
    await new Promise(resolve => setTimeout(resolve, 0))

    const response = await fetch(apiUrl('/api/games/'), {
        cache: 'no-store',
        method: 'POST',
        headers: {
          ...noCacheHeaders,
          'Authorization': `Token ${myPlayer.token}`
        },
        body: JSON.stringify({
          multiplayer: multiplayer === '1',
          country: country.code,
          language: language,
          level: level,
          length: length,
          media: mediaType,
          tax_order: mediaType === 'audio' ? (soundsScope === 'passerines' ? 'Passeriformes' : undefined) : taxOrder?.tax_order,
          tax_family: taxFamily?.tax_family,
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

  const createRematchGame = async (oldGame: Game, myPlayer?: Player) => {
    myPlayer = myPlayer ?? player
    if (!myPlayer) {
      console.log("Can't create rematch game, player is not set.")
      return
    }

    // Clear old game state
    const oldGameToken = localStorage.getItem('game-token')
    if (oldGameToken) {
      localStorage.removeItem('game-token')
    }
    setGame(undefined)
    
    await new Promise(resolve => setTimeout(resolve, 0))

    // Create new game with same specifications as old game
    const response = await fetch(apiUrl('/api/games/'), {
        cache: 'no-store',
        method: 'POST',
        headers: {
          ...noCacheHeaders,
          'Authorization': `Token ${myPlayer.token}`
        },
        body: JSON.stringify({
          multiplayer: oldGame.host ? true : (multiplayer === '1'),
          country: oldGame.country.code,
          language: oldGame.language,
          level: oldGame.level,
          length: oldGame.length.toString(),
          media: oldGame.media,
          tax_order: oldGame.tax_order,
          tax_family: oldGame.tax_family,
          include_rare: oldGame.include_rare,
          include_escapes: oldGame.include_escapes
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
    const response = await fetch(apiUrl(`/api/games/${gameCode}/`), {
      cache: 'no-store',
      method: 'GET',
      headers: noCacheHeaders
    })
    if (response.status === 200) {
      const data = await response.json()
      setGame(data)
      return data as Game
    } else {
      console.log('Could not load game.')
      localStorage.removeItem('game-token')
      const data = await response.json()
      console.log('Could not load player.', response.status, data);
      window.location.reload();
    }
    setLoading(false)
  }

  useEffect(() => {
    // Only load game from localStorage if:
    // 1. gameToken exists in localStorage
    // 2. No game is currently set in state
    // 3. The gameToken doesn't match the current game (to prevent reloading same game)
    if (gameToken && !game) {
      loadGame(gameToken)
    } else if (gameToken && game && gameToken !== game.token) {
      // Game token in localStorage doesn't match current game - clear it
      // This prevents loading old games after rematch
      console.log('Game token mismatch, clearing localStorage:', {
        localStorageToken: gameToken,
        currentGameToken: game.token
      })
      localStorage.removeItem('game-token')
    }
  }, [gameToken, game]);

  const startCountryChallenge = async (country: Country, player: Player) => {
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/country-challenges/'), {
        cache: 'no-store',
        method: 'POST',
        headers: {
          ...noCacheHeaders,
          'Authorization': `Token ${player.token}`
        },
        body: JSON.stringify({country_code: country.code})
      })
      const data = await response.json()
      setCountryChallenge(data as CountryChallenge)
    } catch (error) {
      toaster.create({
        title: "Error starting challenge",
        description: "Unable to start the challenge. Please try again.",
        colorPalette: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCountryChallenge = async () => {
    const playerToken = localStorage.getItem('player-token')
    if (!playerToken) {
      console.log('Player token is not set.')
      return
    }
    if (!player) {
      await loadPlayer(playerToken)
    }
    setLoading(true)
    try {
      const response = await fetch(apiUrl(`/api/country-challenges/current/`), {
        cache: 'no-store',
        method: 'GET',
        headers: {
          ...noCacheHeaders,
          'Authorization': `Token ${playerToken}`
        }
      })
      const data = await response.json()
      setCountryChallenge(data as CountryChallenge)
    } catch (error) {
      toaster.create({
        title: "Error loading challenge",
        description: "Please start a new country challenge.",
        colorPalette: "error"
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

    const response = await fetch(apiUrl(`/api/answer/`), {
      method: 'POST',
      headers: {
        ...noCacheHeaders,
        'Authorization': `Token ${player.token}`,
      },
      body: JSON.stringify({
        question_id: question_id,
        answer_id: answer_id,
        player_token: player.token,
      })
    })
    const data = await response.json()
    await loadCountryChallenge()
    return data
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
    const hash = new Date().getTime()
    setChallengeQuestion(undefined)
    const response = await fetch(apiUrl(`/api/challenge/${countryChallenge.id}/next-level?${hash}`), {
      method: 'POST',
      headers: {
        ...noCacheHeaders,
        'Authorization': `Token ${player.token}`,
      },
      cache: 'no-store'
    })
    loadCountryChallenge()

  }

  const getNewChallengeQuestion = async () => {
    if (!countryChallenge) {
      await loadCountryChallenge()
      if (!countryChallenge) {
        console.log('No country challenge set.')
        return
      }
    }
    const gameToken = countryChallenge?.levels[0].game.token
    if (!gameToken) {
      console.log('No game token found.')
      return
    }
    const hash = new Date().getTime()

    const response = await fetch(apiUrl(`/api/games/${gameToken}/question?${hash}`), {
      method: 'GET',
      headers: {
        ...noCacheHeaders,
      },
      cache: 'no-store'
    })
    console.log('response', response)
    const data = await response.json()
    if (response.status === 200) {
      // Validate that the question belongs to the game we requested using centralized validator
      const question = data as Question
      const { validateQuestionForGame } = await import('./game-token-validator')
      if (validateQuestionForGame(question, gameToken)) {
        setChallengeQuestion(question)
      } else {
        console.error('Question validation failed:', {
          questionToken: question.game?.token,
          expectedToken: gameToken
        })
      }
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
      taxFamily,
      setTaxFamily,
      length,
      setLength,
      country,
      setCountry,
      language,
      setLanguage,
      speciesLanguage,
      multiplayer,
      setMultiplayer,
      mediaType,
      setMediaType,
      soundsScope,
      setSoundsScope,
      player,
      createPlayer,
      createGame,
      createRematchGame,
      loadGame,
      game,
      setGame,
      startCountryChallenge,
      countryChallenge,
      loadCountryChallenge,
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