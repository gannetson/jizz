import {createContext, Dispatch, SetStateAction} from 'react';
import { useState } from 'react';


export type Country = {
  code: string
  name: string
  count?: number
}

export type Language = {
  code: string
  name: string
}

export type Game = {
  token: string
  level: string
  created: string
  country: Country
  language: string
  question: Question
  length: number
  progress: number
  media: string
  repeat: boolean
  ended?: boolean
  host?: Player
  current_highscore?: Player
  include_rare: boolean
  include_escapes: boolean
}

export type SpeciesImage = {
  url: string;
  link?: string
  contributor?: string
}

export type SpeciesVideo = {
  url: string;
  link?: string
  contributor?: string
}

export type SpeciesSound = {
  url: string;
  link?: string
  contributor?: string
}

export type Species = {
  id: number
  name: string
  name_nl: string
  name_latin: string
  images: SpeciesImage[]
  sounds: SpeciesSound[]
  videos: SpeciesVideo[]
  correct?: boolean
}


export type Question = {
  id: number
  number: number
  sequence: number
  done?: boolean
  game: Game
  options?: Species[]
  images: SpeciesImage[]
  sounds: SpeciesSound[]
  videos: SpeciesVideo[]

}

export type Player = {
  id: number
  token: string
  name: string
  is_host?: boolean
  language: string
  score?: number
  last_answer?: Answer
}

export type MultiPlayer = {
  id: number
  name: string
  is_host?: boolean
  language?: string
  status?: 'waiting' | 'correct' | 'incorrect'
  score?: number
  ranking?: number
  last_answer?: Answer
}


export type Answer = {
  question?: Question
  answer?: Species
  species?: Species
  player?: Player
  error?: number
  number?: number
  correct?: boolean
  score?: number
}


export type Score = {
  name: string
  score: number
  created: Date
  level: string
  country: Country
  media: string
  length: number
}


export type Reaction = {
  created: Date
  message: string
  name: string
  update_id: number
  player_token: string
}

export type User = {
  username: string
  first_name: string
  last_name: string
}


export type Update = {
  created: Date
  message: string
  title: string
  user: User
  reactions: Reaction[]
}

export type ChallengeLevel = {
  sequence: number
  level: 'beginner' | 'advanced' | 'expert'
  title: string
  description: string
  length: number
  media: string
  jokers: number
}

export type CountryGame = {
  id: number
  game: Game
  challenge_level: ChallengeLevel
  created: string
  status: 'new' | 'running' | 'passed' | 'failed'
  remaining_jokers: number
}

export type CountryChallenge = {
  id: number
  country: Country
  player: Player
  created: string
  levels: CountryGame[]
  status: 'new' | 'running' | 'passed' | 'failed'
}

type SharedState = {
  playerName?: string
  setPlayerName?: Dispatch<SetStateAction<string | undefined>>
  player?: Player
  createPlayer: () => Promise<Player | undefined>
  includeRare: boolean
  setIncludeRare: Dispatch<SetStateAction<boolean>>
  includeEscapes: boolean
  setIncludeEscapes: Dispatch<SetStateAction<boolean>>
  game?: Game
  createGame: (player?: Player) => Promise<Game | undefined>
  startCountryChallenge: (country: Country, player: Player) => Promise<void>
  countryChallenge?: CountryChallenge
  challengeQuestion?: Question
  getNewChallengeQuestion: () => Promise<void>
  selectChallengeAnswer: (species: Species) => Promise<void>
  setLoading: Dispatch<SetStateAction<boolean>>
  loadGame: (gameCode: string) => Promise<Game | undefined>
  setGame: (game?: Game) => void
  level: string
  setLevel: Dispatch<SetStateAction<string>>
  taxOrder: string
  setTaxOrder: Dispatch<SetStateAction<string>>
  length: string
  setLength: Dispatch<SetStateAction<string>>
  country: Country | undefined
  setCountry: Dispatch<SetStateAction<Country>>
  language?: 'en' | 'nl' | 'la'
  setLanguage?: Dispatch<SetStateAction<'en' | 'nl' | 'la'>>
  multiplayer?: string
  setMultiplayer?: Dispatch<SetStateAction<string>>
  mediaType: string
  setMediaType: Dispatch<SetStateAction<string>>
  species?: Species[]
  loading?: boolean
};

const AppContext = createContext<SharedState>({
  createPlayer: async () => undefined,
  createGame: async () => undefined,
  loading: false,
  setLoading: () => false,
  loadGame: async () => undefined,
  setGame: () => {},
  includeEscapes: false,
  setIncludeEscapes: () => {},
  includeRare: true,
  setIncludeRare: () => {},
  level: 'advanced',
  setLevel: () => {},
  taxOrder: '',
  setTaxOrder: () => {},
  length: '10',
  setLength: () => {},
  country: { code: 'nl', name: 'Netherlands' },
  setCountry: () => {},
  mediaType: 'images',
  setMediaType: () => {},
  startCountryChallenge: async () => {},
  countryChallenge: undefined,
  getNewChallengeQuestion: async () => {},
  challengeQuestion: undefined,
  selectChallengeAnswer: async () => {},
});

export default AppContext;