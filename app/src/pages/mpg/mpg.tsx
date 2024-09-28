import React, { useState, useEffect, ChangeEvent } from 'react';
import {useParams} from "react-router-dom"

// Define types for WebSocket data
interface WebSocketData {
  questions?: string[];
  score?: number;
  message?: string;
  player_name?: string;
}

const MultiPlayerGame: React.FC = () => {
  const { gameCode, playerName } = useParams<{ gameCode: string, playerName: string }>();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answer, setAnswer] = useState<string>("");
  const [score, setScore] = useState<number>(0);

  useEffect(() => {
    const socketInstance = new WebSocket(`ws://localhost:8000/ws/quiz/${gameCode}/`);

    socketInstance.onmessage = (event: MessageEvent) => {
      const data: WebSocketData = JSON.parse(event.data);

      if (data.questions) {
        setQuestions(data.questions);
      }

      if (data.score) {
        setScore(data.score);
      }
    };

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, [gameCode]);

  const submitAnswer = () => {
    if (socket) {
      socket.send(JSON.stringify({
        action: 'submit_answer',
        player_name: playerName,
        question_id: currentQuestionIndex + 1,
        answer: answer,
      }));
    }

    setAnswer("");
    setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
  };

  const handleAnswerChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAnswer(e.target.value);
  };

  return (
    <div>
      {questions.length > 0 && currentQuestionIndex < questions.length ? (
        <div>
          <h3>Question {currentQuestionIndex + 1}</h3>
          <p>{questions[currentQuestionIndex]}</p>
          <input
            type="text"
            value={answer}
            onChange={handleAnswerChange}
          />
          <button onClick={submitAnswer}>Submit Answer</button>
        </div>
      ) : (
        <div>
          <h3>Game Over</h3>
          <p>Your score: {score}</p>
        </div>
      )}
    </div>
  );
};

export default MultiPlayerGame;
