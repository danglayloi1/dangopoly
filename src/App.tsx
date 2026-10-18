import { useState } from 'react';
import { createGame, type NewPlayer } from './engine/game';
import type { GameState } from './engine/types';
import { LangProvider } from './i18n/LangContext';
import { GameScreen } from './ui/GameScreen';
import { SetupScreen } from './ui/SetupScreen';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [gameNumber, setGameNumber] = useState(0);

  const start = (players: NewPlayer[], startingCash: number) => {
    setGame(createGame({ players, startingCash }));
    setGameNumber((n) => n + 1);
  };

  return (
    <LangProvider>
      {game ? (
        <GameScreen key={gameNumber} initialGame={game} onNewGame={() => setGame(null)} />
      ) : (
        <SetupScreen onStart={start} />
      )}
    </LangProvider>
  );
}
