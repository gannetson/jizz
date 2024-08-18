import {createContext, Dispatch, SetStateAction} from 'react';


export type Country = {
  code: string
  name: string
}


export type Game = {
  token: string
  level: string
  created: string
  country: Country
  questions: Question[]
  correct: number
}

export type SpeciesImage = {
  url: string;
}

export type Species = {
  id: number;
  name: string;
  name_latin: string;
  images: SpeciesImage[],
  correct?: boolean
}


export type Question = {
  id: number
  species: Species,
  options?: Species[]
  errors?: number
  correct?: boolean
  picNum?: number
  answer?: Species | null
}


type SharedState = {
  level?: string
  setLevel?: Dispatch<SetStateAction<string>>
  country?: Country | undefined
  setCountry?: Dispatch<SetStateAction<Country | undefined>>
  game?: Game | undefined
  setGame?: Dispatch<SetStateAction<Game | undefined>>
  progress?: string
  species?: Species[]
  setCorrect?: (question:Question) => void,
  setWrong?: (question:Question) => void,
  getNextQuestion?: () => Question | undefined,
  loading?: boolean
};

const AppContext = createContext<SharedState>({});

export default AppContext;