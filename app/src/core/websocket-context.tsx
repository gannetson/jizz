import {createContext, Dispatch, SetStateAction} from 'react';
import {Answer} from "./app-context"


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
  last_answer?: Answer
}

type SharedState = {
  socket?: WebSocket
  player?: Player
  setPlayer?: Dispatch<SetStateAction<Player | undefined>>
  mpg?: Game | undefined
  gameToken?: string | null
  setGameToken?: Dispatch<SetStateAction<string | null>>
  question?: Question
  species?: Species[]
  players?: MultiPlayer[]
  setMpg?: Dispatch<SetStateAction<Game | undefined>>
  startGame?: ()=>void
  joinGame?: ({gameToken, playerToken} : {gameToken: string, playerToken: string})=>void
  startSocket?: ({gameToken} : {gameToken: string})=>void
  submitAnswer?: (answer: Answer)=>void
  nextQuestion?: ()=>void
  answer?: Answer
};

const WebsocketContext = createContext<SharedState>({

});

export default WebsocketContext;