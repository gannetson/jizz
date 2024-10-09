import {createContext, Dispatch, SetStateAction} from 'react';


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
}

export type SpeciesImage = {
  url: string;
}

export type SpeciesVideo = {
  url: string;
}

export type SpeciesSound = {
  url: string;
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
  game: Game
  options?: Species[]
}

export type Player = {
  code: string
  name: string
}


export type Answer = {
  question: Question
  species: Species
  player: Player
  error?: number
  correct?: boolean
}


type SharedState = {
  player?: Player
  setPlayer?: Dispatch<SetStateAction<Player | undefined>>
  level?: string
  setLevel?: Dispatch<SetStateAction<string>>
  length?: string
  setLength?: Dispatch<SetStateAction<string>>
  country?: Country | undefined
  setCountry?: Dispatch<SetStateAction<Country | undefined>>
  language?: string | undefined
  setLanguage?: Dispatch<SetStateAction<string | undefined>>
  multiplayer?: string
  setMultiplayer?: Dispatch<SetStateAction<string>>
  game?: Game | undefined
  setGame?: Dispatch<SetStateAction<Game | undefined>>
  progress?: string
  species?: Species[]
  setCorrect?: (question:Question) => void,
  setWrong?: (question:Question) => void,
  getNextQuestion?: () => Question | undefined,
  loading?: boolean
};

const AppContext = createContext<SharedState>({

});

export default AppContext;