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
  media: string
  repeat: boolean
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
  number: number
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
  language: string
  is_host?: boolean
  score?: number
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


type SharedState = {
  socket?: WebSocket

  player?: Player
  setPlayer?: Dispatch<SetStateAction<Player | undefined>>
  level?: string
  setLevel?: Dispatch<SetStateAction<string>>
  length?: string
  setLength?: Dispatch<SetStateAction<string>>
  country?: Country | undefined
  setCountry?: Dispatch<SetStateAction<Country | undefined>>
  language?: 'en' | 'nl'
  setLanguage?: Dispatch<SetStateAction<'en' | 'nl'>>
  multiplayer?: string
  setMultiplayer?: Dispatch<SetStateAction<string>>
  mediaType?: string
  setMediaType?: Dispatch<SetStateAction<string>>
  game?: Game | undefined
  setGame?: Dispatch<SetStateAction<Game | undefined>>
  progress?: string
  species?: Species[]
  getNextQuestion?: () => void,
  loading?: boolean
  commitAnswer?: (answer: Answer) => void
  answer?: Answer
};

const AppContext = createContext<SharedState>({

});

export default AppContext;