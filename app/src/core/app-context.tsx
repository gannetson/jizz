import {createContext, Dispatch, SetStateAction} from 'react';


export type Country = {
  code: string
  name: string
}


export type SpeciesImage = {
  url: string;
}

export type Species = {
  name: string;
  name_latin: string;
  images: SpeciesImage[],
  correct?: boolean
}


export type Question = {
  species: Species,
  options?: Species[]
  picNum?: number
  answer?: Species | null
}


type SharedState = {
  level?: string
  setLevel?: Dispatch<SetStateAction<string>>
  country?: Country | undefined
  setCountry?: Dispatch<SetStateAction<Country | undefined>>
  species?: Species[]
  setCorrect?: (species:Species) => void,
  getNextQuestion?: () => Question | undefined,
  loading?: boolean
};

const AppContext = createContext<SharedState>({});

export default AppContext;