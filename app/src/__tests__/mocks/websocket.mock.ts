// Mock WebSocket service for testing
import { WebSocketService, WebSocketCallbacks } from '../../services/websocket.service';
import { Game, Player, MultiPlayer, Question, Answer } from '../../api/types';

export class MockWebSocketService implements WebSocketService {
  private connected = false;
  private callbacks: WebSocketCallbacks = {};
  private sentMessages: Array<Record<string, unknown>> = [];

  connect(game: Game, player: Player, language: string, callbacks: WebSocketCallbacks): WebSocket {
    this.connected = true;
    this.callbacks = callbacks;
    // Return a mock WebSocket object
    return {} as WebSocket;
  }

  disconnect(): void {
    this.connected = false;
    this.callbacks = {};
  }

  send(data: Record<string, unknown>): void {
    this.sentMessages.push(data);
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Test helpers
  simulateMessage(message: { action: string; [key: string]: unknown }): void {
    switch (message.action) {
      case 'update_players':
        this.callbacks.onPlayersUpdate?.(message.players as MultiPlayer[]);
        break;
      case 'new_question':
        this.callbacks.onNewQuestion?.(message.question as Question);
        break;
      case 'game_started':
        this.callbacks.onGameStarted?.();
        break;
      case 'game_updated':
        this.callbacks.onGameUpdated?.(message.game as Game);
        break;
      case 'answer_checked':
        this.callbacks.onAnswerChecked?.(message.answer as Answer);
        break;
    }
  }

  getSentMessages(): Array<Record<string, unknown>> {
    return this.sentMessages;
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }
}

export const mockWebSocketService = new MockWebSocketService();

