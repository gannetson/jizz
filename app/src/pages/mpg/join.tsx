import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const JoinGame: React.FC = () => {
  const [gameCode, setGameCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const navigate = useNavigate();

  const joinGame = () => {
    // WebSocket connection will be created in the Lobby screen after this step
    navigate(`/lobby/${gameCode}?playerName=${playerName}`);
  };

  return (
    <div>
      <h2>Join an Existing Game</h2>
      <input
        type="text"
        value={gameCode}
        onChange={(e) => setGameCode(e.target.value.toUpperCase())}
        placeholder="Enter Game Code"
      />
      <input
        type="text"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Enter your name"
      />
      <button onClick={joinGame} disabled={!gameCode || !playerName}>
        Join Game
      </button>
    </div>
  );
};

export default JoinGame;
