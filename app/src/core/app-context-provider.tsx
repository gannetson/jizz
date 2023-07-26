import React, {FC, ReactNode, useCallback, useEffect, useState} from 'react';
import AppContext, {Country, Question, Species} from "./app-context";

type Props = {
  children: ReactNode;
};


const AppContextProvider: FC<Props> = ({children}) => {
  const [level, setLevel] = useState<string>('beginner');
  const [country, setCountry] = useState<Country | undefined>();
  const [species, setSpecies] = useState<Species[]>([]);
  const [loading, setLoading] = useState(false)

  const fetchSpecies = useCallback(async (country:Country) => {
    try {
      const response = await fetch(`/api/species/?countries__country=${country.code}&format=json`)
      const data = await response.json();
      console.log('Data received')
      setSpecies(data);
      console.log('Species set')
      setLoading(false);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    if (!country) return
    if (species.length === 0 && !loading) {
      fetchSpecies(country)
    }
  }, [country, species])

  const randomSpecies  = (onlyRemaining=false)=>{
    if (onlyRemaining) {
      const remainingSpecies = species.filter((sp) => !sp.correct);
      return remainingSpecies[Math.floor(Math.random() * remainingSpecies.length)];
    }
    return species[Math.floor(Math.random() * species.length)];
  }

  const getOptions = (mystery: Species) => {

    if (level === 'beginner') {
      return [mystery, randomSpecies(), randomSpecies(), randomSpecies()]
    } else if (level === 'advanced') {
      let index = species.indexOf(mystery)
      index -= 2
      if (index < 0) index = 0
      const options: Species[] = [
        species[index],
        species[index + 1],
        species[index + 2],
        species[index + 3],
        species[index + 4],
        species[index + 5],
      ]
      return options.sort(() => Math.random() - 0.5)
    }
  }

  const getNextQuestion = () => {
    const nextSpecies = randomSpecies(true)
    if (nextSpecies) {
      const nextQuestion:Question = {
        species: nextSpecies,
        options: getOptions(nextSpecies)
      }
      return nextQuestion
    }
  };

  const setCorrect = (spec: Species) => {
    const index = species.indexOf(spec)
    species[index].correct = true
    setSpecies(species)
    console.log(species.filter((sp)=>sp.correct))
  }

  return (
    <AppContext.Provider value={{
      level,
      setLevel,
      country,
      setCountry,
      getNextQuestion,
      setCorrect,
      species,
      loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export {AppContextProvider};