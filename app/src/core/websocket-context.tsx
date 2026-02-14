import {createContext, Dispatch, SetStateAction} from 'react';
import {Answer, Game, MultiPlayer, Player, Question, Species} from "./app-context"


type SharedState = {
  question?: Question
  players?: MultiPlayer[]
  startGame: ()=>void
  joinGame: (game?: Game, player?: Player) =>void
  submitAnswer: (answer: Answer)=>void
  nextQuestion: ()=>void
  answer?: Answer
  socket?: WebSocket
  clearQuestion: ()=>void
};

const WebsocketContext = createContext<SharedState>({
  startGame: () => {},
  joinGame: (game?: Game, player?: Player) => {},
  submitAnswer: () => {},
  nextQuestion: () => {},
  clearQuestion: () => {},
});

export default WebsocketContext;