import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

interface Player {
  name: string;
}

const Lobby: React.FC = () => {
  const { gameCode } = useParams<{ gameCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<Player[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const playerName = new URLSearchParams(location.search).get('playerName');

  useEffect(() => {
    const socketInstance = new WebSocket(`ws://localhost:8050/ws/quiz/${gameCode}/`);

    socketInstance.onopen = () => {
      // Join the game
      socketInstance.send(JSON.stringify({
        action: 'join_game',
        player_name: playerName
      }));
    };

    socketInstance.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.message) {
        console.log(data.message); // log player joins
      }

      if (data.players) {
        setPlayers(data.players); // assuming server sends player list
      }
    };

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, [gameCode, playerName]);

  const startGame = () => {
    if (socket) {
      socket.send(JSON.stringify({
        action: 'start_game',
      }));
      navigate(`/mpg/game/${gameCode}?playerName=${playerName}`);
    }
  };

  return (
    <div>
      <h2>Lobby - Game Code: {gameCode}</h2>
      <p>Share this game code with your friends!</p>
      <h3>Players Joined:</h3>
      <ul>
        {players.map((player, index) => (
          <li key={index}>{player.name}</li>
        ))}
      </ul>
      <button onClick={startGame} disabled={players.length < 2}>
        Start Game
      </button>
    </div>
  );
};

export default Lobby;
