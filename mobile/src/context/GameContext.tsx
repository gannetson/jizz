import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Country } from '../api/countries';
import type { Language } from '../api/languages';
import type { Player } from '../api/player';
import type { Game } from '../api/games';
import * as playerApi from '../api/player';
import * as gamesApi from '../api/games';
import * as authApi from '../api/auth';

const PLAYER_TOKEN_KEY = playerApi.PLAYER_TOKEN_STORAGE_KEY;
const GAME_TOKEN_KEY = 'game-token';

type GameContextType = {
  playerName: string;
  setPlayerName: (v: string) => void;
  country: Country | undefined;
  setCountry: (c: Country) => void;
  language: string;
  setLanguage: (v: string) => void;
  level: string;
  setLevel: (v: string) => void;
  length: string;
  setLength: (v: string) => void;
  mediaType: string;
  setMediaType: (v: string) => void;
  soundsScope: 'all' | 'passerines';
  setSoundsScope: (v: 'all' | 'passerines') => void;
  includeRare: boolean;
  setIncludeRare: (v: boolean) => void;
  player: Player | null;
  game: Game | null;
  loading: boolean;
  createPlayer: () => Promise<Player | null>;
  createGame: () => Promise<Game | null>;
  loadGame: (token: string) => Promise<Game | null>;
  setGame: (g: Game | null) => void;
  setPlayer: (p: Player | null) => void;
  loadStoredPlayer: () => Promise<void>;
  clearGame: () => Promise<void>;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [playerName, setPlayerName] = useState('');
  const [country, setCountry] = useState<Country | undefined>(undefined);
  const [language, setLanguage] = useState('en');
  const [level, setLevel] = useState('advanced');
  const [length, setLength] = useState('10');
  const [mediaType, setMediaType] = useState('images');
  const [soundsScope, setSoundsScope] = useState<'all' | 'passerines'>('all');
  const [includeRare, setIncludeRare] = useState(true);
  const [player, setPlayer] = useState<Player | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStoredPlayer = useCallback(async () => {
    const token = await AsyncStorage.getItem(PLAYER_TOKEN_KEY);
    if (token) {
      const p = await playerApi.getPlayer(token);
      if (p) {
        setPlayer(p);
        if (!playerName) setPlayerName(p.name);
        setLanguage(p.language);
      } else {
        await AsyncStorage.removeItem(PLAYER_TOKEN_KEY);
      }
    }
  }, [playerName]);

  useEffect(() => {
    loadStoredPlayer();
  }, []);

  const createPlayer = useCallback(async () => {
    if (!playerName.trim() || !country) return null;
    setLoading(true);
    try {
      const accessToken = await authApi.getAccessToken();
      const p = await playerApi.createPlayer(playerName.trim(), language, accessToken);
      if (p) {
        await AsyncStorage.setItem(PLAYER_TOKEN_KEY, p.token);
        setPlayer(p);
        return p;
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [playerName, language, country]);

  const createGame = useCallback(async () => {
    let p = player;
    if (!p) {
      p = await createPlayer();
      if (!p) return null;
    }
    if (!country) return null;
    setLoading(true);
    try {
      await AsyncStorage.removeItem(GAME_TOKEN_KEY);
      const g = await gamesApi.createGame(p.token, {
        multiplayer: false,
        country: country.code,
        language,
        level,
        length,
        media: mediaType,
        include_rare: includeRare,
        include_escapes: false,
        ...(mediaType === 'audio' && soundsScope === 'passerines' ? { tax_order: 'Passeriformes' } : {}),
      });
      if (g) {
        await AsyncStorage.setItem(GAME_TOKEN_KEY, g.token);
        setGame(g);
        return g;
      }
    } finally {
      setLoading(false);
    }
    return null;
  }, [player, country, language, level, length, mediaType, soundsScope, includeRare, createPlayer]);

  const clearGame = useCallback(async () => {
    await AsyncStorage.removeItem(GAME_TOKEN_KEY);
    setGame(null);
  }, []);

  const loadGame = useCallback(async (token: string): Promise<Game | null> => {
    const g = await gamesApi.loadGame(token);
    if (g) setGame(g);
    return g;
  }, []);

  return (
    <GameContext.Provider
      value={{
        playerName,
        setPlayerName,
        country,
        setCountry,
        language,
        setLanguage,
        level,
        setLevel,
        length,
        setLength,
        mediaType,
        setMediaType,
        soundsScope,
        setSoundsScope,
        includeRare,
        setIncludeRare,
        player,
        game,
        loading,
        createPlayer,
        createGame,
        loadGame,
        setGame,
        setPlayer,
        loadStoredPlayer,
        clearGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
