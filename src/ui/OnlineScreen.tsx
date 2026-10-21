import { useEffect, useState } from 'react';
import { whoseMove } from '../engine/game';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import type { RoomView } from '../net/protocol';
import { useRoom, type RoomState } from '../net/useRoom';
import { FirstTurnResult } from './FirstTurnResult';
import { GameTable } from './GameTable';
import { LangSwitch, ThemeButton } from './Header';
import { Lobby } from './Lobby';
import { usePresentation } from './usePresentation';
import { ViewerProvider } from './viewer';

interface Props {
  code: string;
  creating: boolean;
  onLeave: () => void;
}

/** An online room: the lobby until the host starts, then the game. */
export function OnlineScreen({ code, creating, onLeave }: Props) {
  const { t } = useLang();
  const state = useRoom(code, creating);

  if (state.missing) {
    return (
      <main className="setup lobby">
        <div className="setup-top lobby-top">
          <button className="secondary small back-button" onClick={onLeave}>
            ← {t.backToMenu}
          </button>
          <span className="spacer" />
          <ThemeButton />
          <LangSwitch />
        </div>
        <p className="lobby-missing">{t.roomMissing(code)}</p>
      </main>
    );
  }
  if (state.room?.stage === 'playing' && state.room.game) {
    return <OnlineGame room={state.room} game={state.room.game} state={state} onLeave={onLeave} />;
  }
  return <Lobby code={code} creating={creating} state={state} onLeave={onLeave} />;
}

function OnlineGame({ room, game, state, onLeave }: { room: RoomView; game: GameState; state: RoomState; onLeave: () => void }) {
  const { t } = useLang();
  const presentation = usePresentation(game);
  const dispatch = (action: Action) => state.send({ t: 'act', action });
  const seat = room.you;
  // The dice for who goes first are shown once, at the start (before anyone has moved).
  const [showFirstTurn, setShowFirstTurn] = useState(room.firstTurn !== null && game.log.length <= 1);
  const myMove = seat !== null && whoseMove(game) === seat;

  // When it becomes this phone's move: a short buzz, and a mark in the tab title.
  useEffect(() => {
    if (!myMove) return;
    navigator.vibrate?.(120);
    const title = document.title;
    document.title = `🎲 ${t.yourTurn} · ${title}`;
    return () => {
      document.title = title;
    };
  }, [myMove, t.yourTurn]);

  const status = (
    <span className={`room-chip${state.status === 'open' ? '' : ' warn'}`} title={t.roomTitle(room.code)}>
      {state.status === 'open' ? (seat === null ? `👀 ${t.watching} · ${room.code}` : room.code) : t.reconnecting}
    </span>
  );

  return (
    <ViewerProvider value={{ online: true, seat, connected: room.seats.map((s) => s.online) }}>
      <GameTable game={game} dispatch={dispatch} presentation={presentation} onLeave={onLeave} headerExtra={status}>
        {state.error && state.error !== 'notAllowed' && (
          <p className="online-toast" role="alert">
            {t.onlineErrors[state.error]}
          </p>
        )}
        {showFirstTurn && room.firstTurn && (
          <FirstTurnResult rounds={room.firstTurn} seats={room.seats} onClose={() => setShowFirstTurn(false)} />
        )}
      </GameTable>
    </ViewerProvider>
  );
}
