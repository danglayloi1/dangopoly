import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createGame, type NewPlayer, type RulesChoice } from './engine/game';
import { isRoomCode, newRoomCode, normalizeRoomCode } from './net/protocol';
import type { SaveFile } from './engine/save';
import type { GameState } from './engine/types';
import { LangProvider, useLang } from './i18n/LangContext';
import { createTutorialGame } from './tutorial/script';
import { GameScreen } from './ui/GameScreen';
import { HubScreen } from './ui/HubScreen';
import { createTienLen, type NewTienLenPlayer, type TienLenState } from './games/tienlen/game';
import { TienLenScreen } from './ui/tienlen/TienLenScreen';
import { TienLenSetup } from './ui/tienlen/TienLenSetup';
import { TienLenMenu } from './ui/tienlen/TienLenMenu';
import { TIENLEN_TEXT } from './games/tienlen/text';
import type { GameKind } from './net/protocol';
import { MenuScreen } from './ui/MenuScreen';
import { MusicPanel } from './ui/MusicPanel';
import { OnlineCard } from './ui/OnlineCard';
import { OnlineScreen } from './ui/OnlineScreen';
import { RoomList } from './ui/RoomList';
import { ScreenTop } from './ui/Header';
import { clearSavedGame, loadSavedGame, resumeClock } from './ui/savedGame';
import { RecordsScreen } from './ui/RecordsScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { SetupScreen } from './ui/SetupScreen';
import { TitleScreen } from './ui/TitleScreen';

export default function App() {
  return (
    <LangProvider>
      <Screens />
      <MusicPanel />
    </LangProvider>
  );
}

/**
 * The entry screen, the hub (pick a game), and Dangopoly's menu with the screens reached from it
 * (a game or a room is shown on top of them).
 */
type Screen = 'title' | 'hub' | 'menu' | 'local' | 'bots' | 'online' | 'records' | 'settings' | 'tienlen' | 'tienlenBots' | 'tienlenOnline';

/**
 * Each screen, game and room gets a browser history entry, so the phone's back button moves
 * between them instead of leaving the site.
 */
type NavState = { dangopoly: 'screen'; screen: Screen } | { dangopoly: 'game' } | { dangopoly: 'room' };

const navState = (): NavState | null => history.state as NavState | null;

/** The room in the address (?room=ABC234), if any: links to a room open it straight away. */
function roomInUrl(): string | null {
  const code = normalizeRoomCode(new URLSearchParams(location.search).get('room') ?? '');
  return isRoomCode(code) ? code : null;
}

/** The screen for the current history entry. A game can't be brought back from history, so it shows the menu. */
function screenInHistory(): Screen {
  const state = navState();
  if (!state) return 'title';
  return state.dangopoly === 'screen' ? state.screen : 'menu';
}

interface OnlineRoom {
  code: string;
  creating: boolean;
  kind?: GameKind; // what a new room will play
}

/** How the next screen comes in: from the right going forward, from the left going back, rising for a game or room. */
type Direction = 'forward' | 'back' | 'rise';

function Screens() {
  const { t, lang, uiLang } = useLang();
  const [screen, setScreen] = useState<Screen>(screenInHistory);
  const [game, setGame] = useState<GameState | null>(null);
  const [gameNumber, setGameNumber] = useState(0);
  const [tutorial, setTutorial] = useState(false);
  const [tienLen, setTienLen] = useState<TienLenState | null>(null);
  // An unfinished game from an earlier visit, offered on the menu.
  const [saved, setSaved] = useState<SaveFile | null>(loadSavedGame);
  const [online, setOnline] = useState<OnlineRoom | null>(() => {
    const code = roomInUrl();
    return code ? { code, creating: false } : null;
  });

  const direction = useRef<Direction>('forward');

  const go = (next: Screen) => {
    direction.current = 'forward';
    history.pushState({ dangopoly: 'screen', screen: next } satisfies NavState, '', location.pathname);
    setScreen(next);
  };

  const toMenu = () => {
    direction.current = 'back';
    history.replaceState({ dangopoly: 'screen', screen: 'menu' } satisfies NavState, '', location.pathname);
    setScreen('menu');
  };

  /** From Dangopoly's menu to the hub, without leaving the site even if the menu was opened first. */
  const toHub = () => {
    direction.current = 'back';
    history.replaceState({ dangopoly: 'screen', screen: 'hub' } satisfies NavState, '', location.pathname);
    setScreen('hub');
  };

  /** From the hub to the entry screen, the same way. */
  const toTitle = () => {
    direction.current = 'back';
    history.replaceState({ dangopoly: 'screen', screen: 'title' } satisfies NavState, '', location.pathname);
    setScreen('title');
  };

  /** Back one screen; if there's nothing of ours behind (opened from a link), to the menu. */
  const back = () => {
    if (navState()?.dangopoly && history.length > 1) history.back();
    else toMenu();
  };

  const play = (next: GameState, asTutorial = false) => {
    // From the menu, the game goes on top of it; from the setup screen, it takes that screen's
    // place, so the back button returns to the menu rather than to the filled-in form.
    const entry: NavState = { dangopoly: 'game' };
    if (screenInHistory() === 'menu') history.pushState(entry, '');
    else history.replaceState(entry, '');
    direction.current = 'rise';
    setTutorial(asTutorial);
    setGame(next);
    setGameNumber((n) => n + 1);
  };

  const start = (players: NewPlayer[], startingCash: number, rules: RulesChoice) =>
    play(createGame({ players, startingCash, rules }));

  /** A Tiến lên match, from its setup screen: it takes that screen's place in the history, like a game of Dangopoly. */
  const startTienLen = (players: NewTienLenPlayer[]) => {
    history.replaceState({ dangopoly: 'game' } satisfies NavState, '');
    direction.current = 'rise';
    setTienLen(createTienLen({ players, seed: crypto.getRandomValues(new Uint32Array(1))[0] }));
    setGameNumber((n) => n + 1);
  };

  // A new room's link only goes in the address once the room exists (see onCreated).
  const openRoom = (code: string, creating: boolean, kind: GameKind = 'dangopoly') => {
    direction.current = 'rise';
    history.pushState({ dangopoly: 'room' } satisfies NavState, '', creating ? location.pathname : `?room=${code}`);
    setOnline({ code, creating, kind });
  };

  const discardSaved = () => {
    clearSavedGame();
    setSaved(null);
  };

  // Back/forward (phone or browser): show whatever the history entry is for.
  useEffect(() => {
    const onPop = () => {
      // The browser's back and forward buttons look the same from here; most presses are "back".
      direction.current = 'back';
      setGame(null);
      setTienLen(null);
      setSaved(loadSavedGame());
      const code = roomInUrl();
      setOnline(code ? { code, creating: false } : null);
      const state = navState();
      if (state && state.dangopoly !== 'screen') {
        history.replaceState({ dangopoly: 'screen', screen: 'menu' } satisfies NavState, '', location.pathname + location.search);
      }
      setScreen(screenInHistory());
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // The in-game and in-room buttons go back through history too, so the back button stays in step.
  const leaveGame = () => {
    if (navState()?.dangopoly === 'game') history.back();
    else {
      setGame(null);
      setSaved(loadSavedGame());
      toMenu();
    }
  };

  const leaveTienLen = () => {
    if (navState()?.dangopoly === 'game') history.back();
    else {
      setTienLen(null);
      toHub();
    }
  };

  const leaveRoom = (kind: GameKind) => {
    if (navState()?.dangopoly === 'room') history.back();
    else {
      // Opened from a link: there's no menu behind it in the history, so go to the game's own.
      setOnline(null);
      setSaved(loadSavedGame());
      if (kind === 'tienlen') {
        direction.current = 'back';
        history.replaceState({ dangopoly: 'screen', screen: 'tienlen' } satisfies NavState, '', location.pathname);
        setScreen('tienlen');
      } else toMenu();
    }
  };

  // Each screen slides or rises in when it changes (see .screen-transition).
  const shown = (view: string, content: ReactNode) => (
    <div key={view} className={`screen-transition ${direction.current}`}>
      {content}
    </div>
  );

  if (online) {
    return shown(
      `room-${online.code}`,
      <OnlineScreen
        key={online.code}
        code={online.code}
        creating={online.creating}
        kind={online.kind}
        onCreated={() => history.replaceState(history.state, '', `?room=${online.code}`)}
        onLeave={leaveRoom}
      />,
    );
  }
  if (tienLen) {
    return shown(`tienlen-${gameNumber}`, <TienLenScreen initial={tienLen} onLeave={leaveTienLen} />);
  }
  if (game) {
    return shown(`game-${gameNumber}`, <GameScreen initialGame={game} onLeave={leaveGame} tutorial={tutorial} />);
  }
  return shown(screen, menuScreen());

  /** The screen picked from the menu. */
  function menuScreen(): ReactNode {
    switch (screen) {
      case 'title':
        return <TitleScreen onEnter={() => go('hub')} />;
      case 'hub':
        return (
          <HubScreen saved={saved} onDangopoly={() => go('menu')} onTienLen={() => go('tienlen')} onSettings={() => go('settings')} onBack={toTitle} />
        );
      case 'tienlen':
        return <TienLenMenu onBots={() => go('tienlenBots')} onOnline={() => go('tienlenOnline')} onBack={toHub} />;
      case 'tienlenBots':
        return <TienLenSetup onStart={startTienLen} onBack={back} />;
      case 'tienlenOnline':
        return (
          <main className="setup">
            <ScreenTop title={`${TIENLEN_TEXT[uiLang].name} · ${TIENLEN_TEXT[uiLang].online}`} onBack={back} />
            <OnlineCard onCreateRoom={() => openRoom(newRoomCode(), true, 'tienlen')} onJoinRoom={(code) => openRoom(code, false)} />
            <RoomList onOpen={(code) => openRoom(code, false)} />
          </main>
        );
      case 'local':
        return <SetupScreen onStart={start} onBack={back} saved={saved} />;
      case 'bots':
        return <SetupScreen onStart={start} onBack={back} saved={saved} vsBots />;
      case 'online':
        return (
          <main className="setup">
            <ScreenTop title={t.online} onBack={back} />
            <OnlineCard onCreateRoom={() => openRoom(newRoomCode(), true)} onJoinRoom={(code) => openRoom(code, false)} />
            <RoomList onOpen={(code) => openRoom(code, false)} />
          </main>
        );
      case 'settings':
        return <SettingsScreen onBack={back} />;
      case 'records':
        return <RecordsScreen onBack={back} />;
      case 'menu':
        return (
          <MenuScreen
            saved={saved}
            onContinue={() => saved && play(resumeClock(saved))}
            onDiscard={discardSaved}
            onLocal={() => go('local')}
            onBots={() => go('bots')}
            onOnline={() => go('online')}
            onTutorial={() => play(createTutorialGame(lang), true)}
            onRecords={() => go('records')}
            onSettings={() => go('settings')}
            onBack={toHub}
          />
        );
    }
  }
}
