import { useState } from 'react';
import { createGame, type NewPlayer } from './engine/game';
import type { SaveFile } from './engine/save';
import type { GameState } from './engine/types';
import { LangProvider, useLang } from './i18n/LangContext';
import { createTutorialGame } from './tutorial/script';
import { GameScreen } from './ui/GameScreen';
import { clearSavedGame, loadSavedGame } from './ui/savedGame';
import { SetupScreen } from './ui/SetupScreen';

export default function App() {
  return (
    <LangProvider>
      <Screens />
    </LangProvider>
  );
}

function Screens() {
  const { lang } = useLang();
  const [game, setGame] = useState<GameState | null>(null);
  const [gameNumber, setGameNumber] = useState(0);
  const [tutorial, setTutorial] = useState(false);
  // An unfinished game from an earlier visit, offered on the setup screen.
  const [saved, setSaved] = useState<SaveFile | null>(loadSavedGame);

  const play = (next: GameState, asTutorial = false) => {
    setTutorial(asTutorial);
    setGame(next);
    setGameNumber((n) => n + 1);
  };

  const start = (players: NewPlayer[], startingCash: number) => play(createGame({ players, startingCash }));

  const discardSaved = () => {
    clearSavedGame();
    setSaved(null);
  };

  const leaveGame = () => {
    if (!tutorial) discardSaved(); // "Ván mới" means this game is over (a tutorial was never saved)
    setGame(null);
  };

  return game ? (
    <GameScreen key={gameNumber} initialGame={game} onNewGame={leaveGame} tutorial={tutorial} />
  ) : (
    <SetupScreen
      onStart={start}
      onTutorial={() => play(createTutorialGame(lang), true)}
      saved={saved}
      onContinue={() => saved && play(saved.game)}
      onDiscard={discardSaved}
    />
  );
}
