import { useEffect, useState } from 'react';
import type { EightsState } from '../../games/eights/game';
import { EIGHTS_TEXT } from '../../games/eights/text';
import { useLang } from '../../i18n/LangContext';
import type { RoomView } from '../../net/protocol';
import type { RoomState } from '../../net/useRoom';
import { ChatBox } from '../ChatBox';
import { Icon } from '../icons';
import { Reactions } from '../Reactions';
import { useChatPopups } from '../useChatPopups';
import { EightsTable } from './EightsScreen';

interface Props {
  room: RoomView;
  game: EightsState; // as this phone may see it: its own hand, counts for the rest
  state: RoomState;
  onLeave: () => void;
}

/** Crazy Eights in an online room: the same table, each phone playing its own seat, plus reactions and chat. */
export function OnlineEights({ room, game, state, onLeave }: Props) {
  const { t, uiLang } = useLang();
  const e8 = EIGHTS_TEXT[uiLang];
  const seat = room.you;
  // The 😊 palette or the chat: opening one closes the other.
  const [panel, setPanel] = useState<'reactions' | 'chat' | null>(null);
  const chatPopups = useChatPopups(room.chat, seat, panel === 'chat');
  const myMove = seat !== null && game.phase === 'playing' && game.current === seat;

  // When it becomes this phone's move: a short buzz, and a mark in the tab title.
  useEffect(() => {
    if (!myMove) return;
    navigator.vibrate?.(120);
    const title = document.title;
    document.title = `🃏 ${e8.yourTurn} · ${title}`;
    return () => {
      document.title = title;
    };
  }, [myMove, e8.yourTurn]);

  const top = (
    <p className="tl-room-line">
      <span className={`room-chip${state.status === 'open' ? '' : ' warn'}`} title={t.roomTitle(room.code)}>
        {state.status !== 'open' ? t.reconnecting : room.code}
        {room.watchers > 0 && (
          <span className="room-chip-watchers" aria-label={t.watchersCount(room.watchers)}>
            {' · '}
            <Icon name="eye" />
            {room.watchers}
          </span>
        )}
      </span>
      {seat === null && (
        <span className="spectator-note-inline" role="status">
          <Icon name="eye" /> {t.spectating}
        </span>
      )}
    </p>
  );

  return (
    <EightsTable
      state={game}
      me={seat}
      onAct={(action) => state.send({ t: 'act', action })}
      onLeave={onLeave}
      leaveLabel={t.leaveRoom}
      canDeal={seat !== null && seat === room.host}
      waitingFor={room.seats[room.host]?.name}
      connected={room.seats.map((s) => s.online)}
      top={top}
    >
      {state.error && state.error !== 'notAllowed' && (
        <p className="online-toast" role="alert">
          {t.onlineErrors[state.error]}
        </p>
      )}
      <Reactions
        room={room}
        reactions={state.reactions}
        onSend={seat === null ? null : (reaction) => state.send({ t: 'react', reaction })}
        open={panel === 'reactions'}
        onOpenChange={(open) => setPanel(open ? 'reactions' : null)}
        chatPopups={chatPopups}
        onOpenChat={() => setPanel('chat')}
        onThrow={null}
      />
      <ChatBox
        room={room}
        onSend={seat === null ? null : (text) => state.send({ t: 'chat', text })}
        besideReactions={seat !== null}
        open={panel === 'chat'}
        onOpenChange={(open) => setPanel(open ? 'chat' : null)}
      />
    </EightsTable>
  );
}
