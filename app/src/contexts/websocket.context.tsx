// WebSocket Service Context - Provides dependency injection for WebSocket service
import React, { createContext, useContext, ReactNode } from 'react';
import { WebSocketService, websocketService } from '../services/websocket.service';

const WebSocketServiceContext = createContext<WebSocketService>(websocketService);

export interface WebSocketServiceProviderProps {
  children: ReactNode;
  websocketService?: WebSocketService;
}

export function WebSocketServiceProvider({
  children,
  websocketService: providedService = websocketService,
}: WebSocketServiceProviderProps) {
  return (
    <WebSocketServiceContext.Provider value={providedService}>
      {children}
    </WebSocketServiceContext.Provider>
  );
}

export function useWebSocketService(): WebSocketService {
  return useContext(WebSocketServiceContext);
}

export { WebSocketServiceContext };

