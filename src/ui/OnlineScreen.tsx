import { useEffect, useState } from 'react';
import { whoseMove } from '../engine/game';
import type { Action, GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import type { RoomView } from '../net/protocol';
import { useRoom, type RoomState } from '../net/useRoom';
import { ChatBox } from './ChatBox';
import { FirstTurnResult } from './FirstTurnResult';
import { GameTable } from './GameTable';
import { LangSwitch, ThemeButton } from './Header';
import { Lobby } from './Lobby';
import { Reactions } from './Reactions';
import { useNow } from './useNow';
import { usePresentation } from './usePresentation';
import { ViewerProvider } from './viewer';
import type { NextGame } from './WinnerPanel';
import { Icon } from './icons';

interface Props {
  code: string;
  creating: boolean;
  onCreated: () => void; // the new room now exists, so its link can go in the address
  onLeave: () => void;
}

/** An online room: the lobby until the host starts, then the game. */
export function OnlineScreen({ code, creating, onCreated, onLeave }: Props) {
  const { t } = useLang();
  const state = useRoom(code, creating);
  const exists = state.room !== null;

  useEffect(() => {
    if (creating && exists) onCreated();
  }, [creating, exists]);

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

  // Timed games: when this phone's clock says time is up, ask the room to end the game (it checks
  // its own clock; the room also ends it by itself after the next move).
  const timed = game.rules.mode.kind === 'time' && game.phase.kind !== 'gameOver';
  const now = useNow(timed);
  const timeUp = game.rules.mode.kind === 'time' && now >= game.rules.mode.endsAt && game.phase.kind === 'awaitRoll';
  useEffect(() => {
    if (timeUp && seat !== null && !presentation.busy) state.send({ t: 'act', action: { type: 'TIME_UP' } });
  }, [timeUp, seat, presentation.busy]);

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

  // After the game the host can open a new one in the same room; the others wait for that.
  const next: NextGame | undefined =
    seat === null ? undefined : seat === room.host ? { label: t.rematch, onClick: () => state.send({ t: 'rematch' }) } : { note: t.waitingRematch(room.seats[room.host].name) };

  const status = (
    <span className={`room-chip${state.status === 'open' ? '' : ' warn'}`} title={t.roomTitle(room.code)}>
      {state.status !== 'open' ? (
        t.reconnecting
      ) : seat === null ? (
        <>
          <Icon name="eye" /> {t.watching} · {room.code}
        </>
      ) : (
        room.code
      )}
    </span>
  );

  return (
    <ViewerProvider value={{ online: true, seat, connected: room.seats.map((s) => s.online) }}>
      <GameTable game={game} dispatch={dispatch} presentation={presentation} onLeave={onLeave} headerExtra={status} next={next}>
        {state.error && state.error !== 'notAllowed' && (
          <p className="online-toast" role="alert">
            {t.onlineErrors[state.error]}
          </p>
        )}
        <Reactions
          room={room}
          reactions={state.reactions}
          onSend={seat === null ? null : (reaction) => state.send({ t: 'react', reaction })}
        />
        <ChatBox room={room} onSend={seat === null ? null : (text) => state.send({ t: 'chat', text })} besideReactions={seat !== null} />
        {showFirstTurn && room.firstTurn && (
          <FirstTurnResult rounds={room.firstTurn} seats={room.seats} onClose={() => setShowFirstTurn(false)} />
        )}
      </GameTable>
    </ViewerProvider>
  );
}
