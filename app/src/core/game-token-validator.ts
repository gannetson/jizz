/**
 * Centralized game token validation utilities
 * 
 * This module provides utilities to ensure we're always working with
 * the correct game token and that any game-related data belongs to the current game.
 */

import { Game, Question } from './app-context';

/**
 * Validates that a question belongs to the specified game token
 */
export function validateQuestionForGame(
  question: Question | undefined,
  gameToken: string | undefined
): boolean {
  if (!question || !gameToken) {
    return false;
  }
  
  const questionGameToken = question.game?.token;
  if (!questionGameToken) {
    console.warn('Question missing game token:', question);
    return false;
  }
  
  if (questionGameToken !== gameToken) {
    console.warn('Question game token mismatch:', {
      questionToken: questionGameToken,
      expectedToken: gameToken,
      questionId: question.id
    });
    return false;
  }
  
  return true;
}

/**
 * Validates that a game token matches the expected token
 */
export function validateGameToken(
  token: string | undefined,
  expectedToken: string | undefined
): boolean {
  if (!token || !expectedToken) {
    return false;
  }
  
  if (token !== expectedToken) {
    console.warn('Game token mismatch:', {
      received: token,
      expected: expectedToken
    });
    return false;
  }
  
  return true;
}

/**
 * Gets the current game token from multiple sources (context, localStorage)
 * Returns the most authoritative source
 */
export function getCurrentGameToken(
  contextGame: Game | undefined,
  localStorageToken: string | null
): string | undefined {
  // Context game is the source of truth
  if (contextGame?.token) {
    return contextGame.token;
  }
  
  // Fallback to localStorage if context doesn't have it
  if (localStorageToken) {
    return localStorageToken;
  }
  
  return undefined;
}

/**
 * Creates a validator function that's bound to a specific game token
 * Useful for WebSocket handlers that need to validate against a specific connection
 */
export function createGameTokenValidator(expectedToken: string | undefined) {
  return {
    validateQuestion: (question: Question | undefined): boolean => {
      return validateQuestionForGame(question, expectedToken);
    },
    validateToken: (token: string | undefined): boolean => {
      return validateGameToken(token, expectedToken);
    },
    getExpectedToken: (): string | undefined => expectedToken
  };
}


