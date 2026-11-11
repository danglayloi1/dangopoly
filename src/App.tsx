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
import { CardGameMenu } from './ui/CardGameMenu';
import { createEights, type EightsState } from './games/eights/game';
import { EIGHTS_TEXT } from './games/eights/text';
import { EightsScreen } from './ui/eights/EightsScreen';
import { EightsLesson } from './ui/eights/EightsLesson';
import { TienLenLesson } from './ui/tienlen/TienLenLesson';
import { createMauMe, type MauMeState } from './games/maume/game';
import { MAUME_TEXT } from './games/maume/text';
import { MauMeScreen } from './ui/maume/MauMeScreen';
import { MauMeLesson } from './ui/maume/MauMeLesson';
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
type Screen = 'title' | 'hub' | 'menu' | 'local' | 'bots' | 'online' | 'records' | 'settings' | 'tienlen' | 'tienlenBots' | 'tienlenOnline' | 'eights' | 'eightsBots' | 'eightsOnline' | 'maume' | 'maumeBots' | 'maumeOnline';
type CardGame = 'tienlen' | 'eights' | 'maume';

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
  const [eights, setEights] = useState<EightsState | null>(null);
  const [maume, setMauMe] = useState<MauMeState | null>(null);
  const [lesson, setLesson] = useState<CardGame | null>(null); // a card game's guided first game
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

  /** A Crazy Eights match, the same way (its players are set up like Tiến lên's). */
  const startEights = (players: NewTienLenPlayer[]) => {
    history.replaceState({ dangopoly: 'game' } satisfies NavState, '');
    direction.current = 'rise';
    setEights(createEights({ players, seed: crypto.getRandomValues(new Uint32Array(1))[0] }));
    setGameNumber((n) => n + 1);
  };

  /** A Màu Mè match, the same way. */
  const startMauMe = (players: NewTienLenPlayer[]) => {
    history.replaceState({ dangopoly: 'game' } satisfies NavState, '');
    direction.current = 'rise';
    setMauMe(createMauMe({ players, seed: crypto.getRandomValues(new Uint32Array(1))[0] }));
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
      setEights(null);
      setMauMe(null);
      setLesson(null);
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

  /** A card game's lesson goes on top of its menu, like a game. */
  const startLesson = (game: CardGame) => {
    history.pushState({ dangopoly: 'game' } satisfies NavState, '');
    direction.current = 'rise';
    setLesson(game);
    setGameNumber((n) => n + 1);
  };

  const leaveLesson = () => {
    if (navState()?.dangopoly === 'game') history.back();
    else setLesson(null);
  };

  /** After a lesson: straight to a real game against the computer (its setup takes the lesson's place). */
  const lessonToBots = (game: CardGame) => {
    const next: Screen = `${game}Bots`;
    history.replaceState({ dangopoly: 'screen', screen: next } satisfies NavState, '', location.pathname);
    direction.current = 'forward';
    setLesson(null);
    setScreen(next);
  };

  const leaveEights = () => {
    if (navState()?.dangopoly === 'game') history.back();
    else {
      setEights(null);
      toHub();
    }
  };

  const leaveMauMe = () => {
    if (navState()?.dangopoly === 'game') history.back();
    else {
      setMauMe(null);
      toHub();
    }
  };

  const leaveRoom = (kind: GameKind) => {
    if (navState()?.dangopoly === 'room') history.back();
    else {
      // Opened from a link: there's no menu behind it in the history, so go to the game's own.
      setOnline(null);
      setSaved(loadSavedGame());
      if (kind !== 'dangopoly') {
        direction.current = 'back';
        history.replaceState({ dangopoly: 'screen', screen: kind } satisfies NavState, '', location.pathname);
        setScreen(kind);
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
  if (lesson === 'tienlen') {
    return shown(`lesson-${gameNumber}`, <TienLenLesson onLeave={leaveLesson} onPlay={() => lessonToBots('tienlen')} />);
  }
  if (lesson === 'eights') {
    return shown(`lesson-${gameNumber}`, <EightsLesson onLeave={leaveLesson} onPlay={() => lessonToBots('eights')} />);
  }
  if (lesson === 'maume') {
    return shown(`lesson-${gameNumber}`, <MauMeLesson onLeave={leaveLesson} onPlay={() => lessonToBots('maume')} />);
  }
  if (maume) {
    return shown(`maume-${gameNumber}`, <MauMeScreen initial={maume} onLeave={leaveMauMe} />);
  }
  if (eights) {
    return shown(`eights-${gameNumber}`, <EightsScreen initial={eights} onLeave={leaveEights} />);
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
          <HubScreen
            saved={saved}
            onDangopoly={() => go('menu')}
            onTienLen={() => go('tienlen')}
            onEights={() => go('eights')}
            onMauMe={() => go('maume')}
            onSettings={() => go('settings')}
            onBack={toTitle}
          />
        );
      case 'tienlen':
        return (
          <CardGameMenu
            text={TIENLEN_TEXT[uiLang]}
            onBots={() => go('tienlenBots')}
            onOnline={() => go('tienlenOnline')}
            onTutorial={() => startLesson('tienlen')}
            onBack={toHub}
          />
        );
      case 'eights':
        return (
          <CardGameMenu
            text={EIGHTS_TEXT[uiLang]}
            onBots={() => go('eightsBots')}
            onOnline={() => go('eightsOnline')}
            onTutorial={() => startLesson('eights')}
            onBack={toHub}
          />
        );
      case 'maume':
        return (
          <CardGameMenu
            text={MAUME_TEXT[uiLang]}
            onBots={() => go('maumeBots')}
            onOnline={() => go('maumeOnline')}
            onTutorial={() => startLesson('maume')}
            onBack={toHub}
          />
        );
      case 'maumeBots':
        return <TienLenSetup title={MAUME_TEXT[uiLang].name} onStart={startMauMe} onBack={back} />;
      case 'maumeOnline':
        return (
          <main className="setup">
            <ScreenTop title={`${MAUME_TEXT[uiLang].name} · ${MAUME_TEXT[uiLang].online}`} onBack={back} />
            <OnlineCard onCreateRoom={() => openRoom(newRoomCode(), true, 'maume')} onJoinRoom={(code) => openRoom(code, false)} />
            <RoomList onOpen={(code) => openRoom(code, false)} />
          </main>
        );
      case 'eightsBots':
        return <TienLenSetup title={EIGHTS_TEXT[uiLang].name} onStart={startEights} onBack={back} />;
      case 'eightsOnline':
        return (
          <main className="setup">
            <ScreenTop title={`${EIGHTS_TEXT[uiLang].name} · ${EIGHTS_TEXT[uiLang].online}`} onBack={back} />
            <OnlineCard onCreateRoom={() => openRoom(newRoomCode(), true, 'eights')} onJoinRoom={(code) => openRoom(code, false)} />
            <RoomList onOpen={(code) => openRoom(code, false)} />
          </main>
        );
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
