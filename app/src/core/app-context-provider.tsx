import React, {FC, ReactNode, useCallback, useEffect, useState} from 'react';
import AppContext, {Game, Country, Question, Species, Language} from "./app-context";

type Props = {
  children: ReactNode;
};


const AppContextProvider: FC<Props> = ({children}) => {
  const [level, setLevel] = useState<string>('beginner');
  const [game, setGame] = useState<Game | undefined>();
  const [country, setCountry] = useState<Country | undefined>();
  const [language, setLanguage] = useState<string | undefined>('en');
  const [loading, setLoading] = useState(false)
  const [species, setSpecies] = useState<Species | undefined>();


  const fetchSpecies = useCallback(async (species:Species) => {
    try {
      const response = await fetch(`/api/species/${species.id}&format=json`)
      const data = await response.json();
      setSpecies(data);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }, [])

  const token = localStorage.getItem('game-token')

  if (!game && !token && document.location.pathname === '/game') {
    document.location.href = '/'
  }

  if (game) {
    game.correct = game?.questions.filter((q)=> q.correct).length
  }

  useEffect(() => {
    if (token) {
      fetch(`/api/games/${token}/`, {
        cache: 'no-cache',
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.json())
        .then(data => {
          setGame(data)
        })
    }
  }, []);



  const randomQuestion = (onlyRemaining=false)=>{
    if (!game) return
    if (onlyRemaining) {
      const remainingSpecies = game.questions.filter((sp) => !sp.correct);
      return remainingSpecies[Math.floor(Math.random() * remainingSpecies.length)];
    }
    return game.questions[Math.floor(Math.random() * game.questions.length)];
  }

  const getOptions = (question: Question) => {
    if (!game) return []

    if (game.level === 'beginner') {
      const options = [question.species, randomQuestion()?.species, randomQuestion()?.species, randomQuestion()?.species]
      return options.sort(() => Math.random() - 0.5)
    } else if (game.level === 'advanced') {
      let index = game?.questions.indexOf(question) || 0
      index -= 2
      if (index < 0) index = 0
      if ((index + 5) >= game.questions.length) index = game.questions.length - 6
      const options: Species[] = [
        game.questions[index].species,
        game.questions[index + 1].species,
        game.questions[index + 2].species,
        game.questions[index + 3].species,
        game.questions[index + 4].species,
        game.questions[index + 5].species,
      ]
      return options.sort(() => Math.random() - 0.5)
    }
    return []
  }

  const getNextQuestion = () => {
    const nextQuestion = randomQuestion(true)
    if (nextQuestion) {
      nextQuestion.options = getOptions(nextQuestion) as Species[]
      return nextQuestion
    }
  };

  const saveQuestion = async (question: Question) => {
    await fetch(`/api/questions/${question.id}/`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(question)
    })
  }

  const setCorrect = (question: Question) => {
    if (game) {
      question.correct = true
      const index = game.questions.indexOf(question)
      game.questions[index] = question
      saveQuestion(question)
      setGame(game)
    }
  }

  const setWrong = (question: Question) => {
    if (game) {
      question.errors = (question.errors || 0) + 1
      const index = game.questions.indexOf(question)
      game.questions[index] = question
      saveQuestion(question)
      setGame(game)
    }
  }

  return (
    <AppContext.Provider value={{
      level,
      setLevel,
      country,
      setCountry,
      language,
      setLanguage,
      game,
      setGame,
      getNextQuestion,
      setCorrect,
      setWrong,
      loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export {AppContextProvider};