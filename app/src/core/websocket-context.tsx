import {createContext, Dispatch, SetStateAction} from 'react';
import {Answer, Game, MultiPlayer, Player, Question, Species} from "./app-context"


type SharedState = {
  question?: Question
  players?: MultiPlayer[]
  startGame: ()=>void
  joinGame: (game?: Game, player?: Player) =>void
  submitAnswer: (answer: Answer)=>void
  nextQuestion: ()=>void
  /** MPG: server broadcasts game_ended to all players when the session is finished. */
  endGame: () => void
  answer?: Answer
  socket?: WebSocket
  clearQuestion: ()=>void
};

const WebsocketContext = createContext<SharedState>({
  startGame: () => {},
  joinGame: (game?: Game, player?: Player) => {},
  submitAnswer: () => {},
  nextQuestion: () => {},
  endGame: () => {},
  clearQuestion: () => {},
});

export default WebsocketContext;