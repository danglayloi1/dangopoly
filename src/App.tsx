import { useEffect, useState } from 'react';
import { createGame, type NewPlayer } from './engine/game';
import { isRoomCode, newRoomCode, normalizeRoomCode } from './net/protocol';
import type { SaveFile } from './engine/save';
import type { GameState } from './engine/types';
import { LangProvider, useLang } from './i18n/LangContext';
import { createTutorialGame } from './tutorial/script';
import { GameScreen } from './ui/GameScreen';
import { MusicPanel } from './ui/MusicPanel';
import { OnlineScreen } from './ui/OnlineScreen';
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

/** The room in the address (?room=ABC234), if any: links to a room open it straight away. */
function roomInUrl(): string | null {
  const code = normalizeRoomCode(new URLSearchParams(location.search).get('room') ?? '');
  return isRoomCode(code) ? code : null;
}

interface OnlineRoom {
  code: string;
  creating: boolean;
}

function Screens() {
  const { lang } = useLang();
  const [game, setGame] = useState<GameState | null>(null);
  const [gameNumber, setGameNumber] = useState(0);
  const [tutorial, setTutorial] = useState(false);
  // An unfinished game from an earlier visit, offered on the setup screen.
  const [saved, setSaved] = useState<SaveFile | null>(loadSavedGame);
  const [online, setOnline] = useState<OnlineRoom | null>(() => {
    const code = roomInUrl();
    return code ? { code, creating: false } : null;
  });

  const play = (next: GameState, asTutorial = false) => {
    // A history entry for the game, so the phone/browser back button returns to this screen.
    history.pushState({ dangopoly: 'game' }, '');
    setTutorial(asTutorial);
    setGame(next);
    setGameNumber((n) => n + 1);
  };

  const start = (players: NewPlayer[], startingCash: number) => play(createGame({ players, startingCash }));

  const openRoom = (code: string, creating: boolean) => {
    history.pushState({ dangopoly: 'online' }, '', `?room=${code}`);
    setOnline({ code, creating });
  };

  const discardSaved = () => {
    clearSavedGame();
    setSaved(null);
  };

  // Back to this screen, or to the room in the address. A local game stays saved (unless it's
  // over), so it can be continued from here; an online room keeps the seat.
  const showMenu = () => {
    setGame(null);
    setSaved(loadSavedGame());
    const code = roomInUrl();
    setOnline(code ? { code, creating: false } : null);
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

  const leaveRoom = () => {
    if ((history.state as { dangopoly?: string } | null)?.dangopoly === 'online') history.back();
    else {
      // Opened from a link: there's no start screen behind it in the history.
      history.replaceState(null, '', location.pathname);
      setOnline(null);
      setSaved(loadSavedGame());
    }
  };

  if (online) return <OnlineScreen key={online.code} code={online.code} creating={online.creating} onLeave={leaveRoom} />;

  return game ? (
    <GameScreen key={gameNumber} initialGame={game} onLeave={leaveGame} tutorial={tutorial} />
  ) : (
    <SetupScreen
      onStart={start}
      onCreateRoom={() => openRoom(newRoomCode(), true)}
      onJoinRoom={(code) => openRoom(code, false)}
      onTutorial={() => play(createTutorialGame(lang), true)}
      saved={saved}
      onContinue={() => saved && play(saved.game)}
      onDiscard={discardSaved}
    />
  );
}
