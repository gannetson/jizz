import React, { createContext, useState, ReactNode } from 'react';

export type Update = {
  id: number;
  title: string;
  content: string;
  date: string;
};

type Player = {
  name: string;
  language: string;
};

type ChallengeLevel = {
  challenge_level: {
    sequence: number;
    title: string;
  };
};

type Country = {
  name: string;
  code: string;
};

type CountryChallenge = {
  country: Country;
  levels: ChallengeLevel[];
};

type AppContextType = {
  player: Player | null;
  loading: boolean;
  countryChallenge: CountryChallenge | null;
  loadCountryChallenge: () => Promise<void>;
  colorMode: 'light' | 'dark';
  toggleColorMode: () => void;
  language: string;
  setLanguage: (lang: string) => void;
};

export const AppContext = createContext<AppContextType>({
  player: null,
  loading: false,
  countryChallenge: null,
  loadCountryChallenge: async () => {},
  colorMode: 'light',
  toggleColorMode: () => {},
  language: 'en',
  setLanguage: () => {},
});

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [countryChallenge, setCountryChallenge] = useState<CountryChallenge | null>(null);
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState('en');

  const toggleColorMode = () => setColorMode(prev => prev === 'light' ? 'dark' : 'light');

  const loadCountryChallenge = async () => {
    // Implement your loading logic here
  };

  return (
    <AppContext.Provider value={{ 
      player, 
      loading, 
      countryChallenge, 
      loadCountryChallenge,
      colorMode,
      toggleColorMode,
      language,
      setLanguage
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext; 