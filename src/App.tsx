import { useEffect, useState } from 'react';
import { createGame, type NewPlayer } from './engine/game';
import type { SaveFile } from './engine/save';
import type { GameState } from './engine/types';
import { LangProvider, useLang } from './i18n/LangContext';
import { createTutorialGame } from './tutorial/script';
import { GameScreen } from './ui/GameScreen';
import { MusicPanel } from './ui/MusicPanel';
import { clearSavedGame, loadSavedGame } from './ui/savedGame';
import { SetupScreen } from './ui/SetupScreen';

export default function App() {
  return (
    <LangProvider>
      <Screens />
      <MusicPanel />
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
    // A history entry for the game, so the phone/browser back button returns to this screen.
    history.pushState({ dangopoly: 'game' }, '');
    setTutorial(asTutorial);
    setGame(next);
    setGameNumber((n) => n + 1);
  };

  const start = (players: NewPlayer[], startingCash: number) => play(createGame({ players, startingCash }));

  const discardSaved = () => {
    clearSavedGame();
    setSaved(null);
  };

  // Back to this screen. The game stays saved (unless it's over), so it can be continued from here.
  const showMenu = () => {
    setGame(null);
    setSaved(loadSavedGame());
  };

  // The back button (phone or browser) while playing comes here instead of leaving the site.
  useEffect(() => {
    window.addEventListener('popstate', showMenu);
    return () => window.removeEventListener('popstate', showMenu);
  }, []);

  // The in-game buttons go back through history too, so the back button stays in step.
  const leaveGame = () => {
    if ((history.state as { dangopoly?: string } | null)?.dangopoly === 'game') history.back();
    else showMenu();
  };

  return game ? (
    <GameScreen key={gameNumber} initialGame={game} onLeave={leaveGame} tutorial={tutorial} />
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
