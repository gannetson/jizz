import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Country } from '../api/countries';
import type { Language } from '../api/languages';
import type { Player } from '../api/player';
import type { Game } from '../api/games';
import type { TaxOrderRow, TaxFamilyRow } from '../api/taxonomy';
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
  taxOrder: TaxOrderRow | undefined;
  setTaxOrder: (v: TaxOrderRow | undefined) => void;
  taxFamily: TaxFamilyRow | undefined;
  setTaxFamily: (v: TaxFamilyRow | undefined) => void;
  player: Player | null;
  game: Game | null;
  loading: boolean;
  createPlayer: () => Promise<Player | null>;
  createGame: () => Promise<Game | null>;
  loadGame: (token: string) => Promise<Game | null>;
  setGame: (g: Game | null) => void;
  setPlayer: (p: Player | null) => void;
  loadStoredPlayer: () => Promise<void>;
  /** Set player name from profile/storage only if we have not already filled it once (cleared field stays empty). */
  trySetInitialPlayerName: (name: string) => void;
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
  const [taxOrder, setTaxOrder] = useState<TaxOrderRow | undefined>(undefined);
  const [taxFamily, setTaxFamily] = useState<TaxFamilyRow | undefined>(undefined);
  const [player, setPlayer] = useState<Player | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);
  /** Avoid overwriting species language after the user picks a value — loadStoredPlayer can run twice (provider + Start). */
  const lastLanguageSyncPlayerTokenRef = useRef<string | null>(null);
  /** Once we set name from storage or profile, never auto-fill again until player token is cleared (logout / invalid token). */
  const initialPlayerNameFilledRef = useRef(false);

  const trySetInitialPlayerName = useCallback((name: string) => {
    const t = name?.trim();
    if (!t) return;
    setPlayerName((prev) => {
      if (initialPlayerNameFilledRef.current) return prev;
      if (prev.trim()) {
        initialPlayerNameFilledRef.current = true;
        return prev;
      }
      initialPlayerNameFilledRef.current = true;
      return t;
    });
  }, []);

  const loadStoredPlayer = useCallback(async () => {
    const token = await AsyncStorage.getItem(PLAYER_TOKEN_KEY);
    if (!token) {
      initialPlayerNameFilledRef.current = false;
      lastLanguageSyncPlayerTokenRef.current = null;
      return;
    }
    const p = await playerApi.getPlayer(token);
    if (p) {
      setPlayer(p);
      trySetInitialPlayerName(p.name);
      if (lastLanguageSyncPlayerTokenRef.current !== p.token) {
        lastLanguageSyncPlayerTokenRef.current = p.token;
        setLanguage(p.language);
      }
    } else {
      await AsyncStorage.removeItem(PLAYER_TOKEN_KEY);
      initialPlayerNameFilledRef.current = false;
      lastLanguageSyncPlayerTokenRef.current = null;
    }
  }, [trySetInitialPlayerName]);

  useEffect(() => {
    loadStoredPlayer();
  }, []);

  useEffect(() => {
    setTaxOrder(undefined);
    setTaxFamily(undefined);
  }, [country?.code]);

  const createPlayer = useCallback(async () => {
    if (!playerName.trim() || !country) return null;
    setLoading(true);
    try {
      const accessToken = await authApi.ensureFreshAccessToken();
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
    } else {
      const trimmed = playerName.trim();
      if (!trimmed) return null;
      if (trimmed !== p.name || language !== p.language) {
        const accessToken = await authApi.ensureFreshAccessToken();
        const updated = await playerApi.updatePlayer(
          p.token,
          { name: trimmed, language },
          accessToken
        );
        if (!updated) return null;
        p = updated;
        setPlayer(updated);
      }
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
        tax_order:
          mediaType === 'audio'
            ? soundsScope === 'passerines'
              ? 'Passeriformes'
              : undefined
            : taxOrder?.tax_order,
        tax_family: taxFamily?.tax_family,
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
  }, [player, playerName, country, language, level, length, mediaType, soundsScope, includeRare, taxOrder, taxFamily, createPlayer]);

  const clearGame = useCallback(async () => {
    await AsyncStorage.removeItem(GAME_TOKEN_KEY);
    setGame(null);
  }, []);

  const loadGame = useCallback(async (token: string): Promise<Game | null> => {
    const g = await gamesApi.loadGame(token);
    if (g) {
      setGame(g);
      setLanguage(g.language || 'en');
      await AsyncStorage.setItem(GAME_TOKEN_KEY, g.token);
      return g;
    }
    return null;
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
        taxOrder,
        setTaxOrder,
        taxFamily,
        setTaxFamily,
        player,
        game,
        loading,
        createPlayer,
        createGame,
        loadGame,
        setGame,
        setPlayer,
        loadStoredPlayer,
        trySetInitialPlayerName,
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
