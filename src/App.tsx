import { useState } from 'react';
import { createGame, type NewPlayer } from './engine/game';
import type { SaveFile } from './engine/save';
import type { GameState } from './engine/types';
import { LangProvider } from './i18n/LangContext';
import { GameScreen } from './ui/GameScreen';
import { clearSavedGame, loadSavedGame } from './ui/savedGame';
import { SetupScreen } from './ui/SetupScreen';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [gameNumber, setGameNumber] = useState(0);
  // An unfinished game from an earlier visit, offered on the setup screen.
  const [saved, setSaved] = useState<SaveFile | null>(loadSavedGame);

  const play = (next: GameState) => {
    setGame(next);
    setGameNumber((n) => n + 1);
  };

  const start = (players: NewPlayer[], startingCash: number) => play(createGame({ players, startingCash }));

  const discardSaved = () => {
    clearSavedGame();
    setSaved(null);
  };

  const leaveGame = () => {
    discardSaved(); // "Ván mới" means this game is over
    setGame(null);
  };

  return (
    <LangProvider>
      {game ? (
        <GameScreen key={gameNumber} initialGame={game} onNewGame={leaveGame} />
      ) : (
        <SetupScreen onStart={start} saved={saved} onContinue={() => saved && play(saved.game)} onDiscard={discardSaved} />
      )}
    </LangProvider>
  );
}
