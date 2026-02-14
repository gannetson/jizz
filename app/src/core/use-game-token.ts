/**
 * Custom hook for game token management and validation
 * 
 * Provides a single source of truth for the current game token
 * and validation utilities that are always in sync with the current game.
 */

import { useContext, useRef, useEffect } from 'react';
import { Game, Question } from './app-context';
import { validateQuestionForGame, getCurrentGameToken } from './game-token-validator';
import AppContext from './app-context';

/**
 * Hook that provides the current game token and validation functions
 * The game token is kept in sync with the game context and localStorage
 */
export function useGameToken() {
  const { game } = useContext(AppContext);
  const gameTokenFromStorage = typeof window !== 'undefined' 
    ? localStorage.getItem('game-token') 
    : null;
  
  // Use a ref to track the current game token for validation
  // This ensures we always have the latest token even in async callbacks
  const currentGameTokenRef = useRef<string | undefined>(
    getCurrentGameToken(game, gameTokenFromStorage)
  );
  
  // Update ref whenever game changes
  useEffect(() => {
    const newToken = getCurrentGameToken(game, gameTokenFromStorage);
    if (newToken !== currentGameTokenRef.current) {
      console.log('Game token updated in useGameToken:', {
        old: currentGameTokenRef.current,
        new: newToken
      });
      currentGameTokenRef.current = newToken;
    }
  }, [game?.token, gameTokenFromStorage]);
  
  /**
   * Get the current game token
   */
  const getCurrentToken = (): string | undefined => {
    return currentGameTokenRef.current;
  };
  
  /**
   * Validate that a question belongs to the current game
   */
  const validateQuestion = (question: Question | undefined): boolean => {
    return validateQuestionForGame(question, currentGameTokenRef.current);
  };
  
  /**
   * Validate that a token matches the current game token
   */
  const validateToken = (token: string | undefined): boolean => {
    if (!token || !currentGameTokenRef.current) {
      return false;
    }
    return token === currentGameTokenRef.current;
  };
  
  return {
    currentGameToken: currentGameTokenRef.current,
    getCurrentToken,
    validateQuestion,
    validateToken,
    hasGame: !!currentGameTokenRef.current
  };
}


