import type { CSSProperties } from 'react';
import { useLang } from '../i18n/LangContext';
import { REACTIONS, type ChatMessage, type ReactionId, type RoomView } from '../net/protocol';
import type { ShownReaction } from '../net/useRoom';
import { colorHex } from './look';
import { TokenIcon } from './TokenIcon';

interface Props {
  room: RoomView;
  reactions: ShownReaction[];
  onSend: ((reaction: ReactionId) => void) | null; // null when only watching
  open: boolean; // the palette (only one of it and the chat is open at a time)
  onOpenChange: (open: boolean) => void;
  chatPopups: ChatMessage[]; // new chat messages, floating up with the reactions
  onOpenChat: () => void; // tapping a message bubble opens the chat
}

/**
 * Online: a 😊 button in the corner opens quick reactions (emoji and Nghệ phrases); whatever anyone
 * sends floats up on every phone for a moment, with the sender's token and name. New chat messages
 * float up the same way.
 */
export function Reactions({ room, reactions, onSend, open, onOpenChange, chatPopups, onOpenChat }: Props) {
  const { t } = useLang();
  const setOpen = onOpenChange;

  return (
    <>
      <div className="reaction-bubbles" aria-live="polite">
        {reactions.map((r) => {
          const seat = room.seats[r.seat];
          if (!seat) return null;
          return (
            <div key={r.id} className="reaction-bubble" style={{ '--player': colorHex(seat.color) } as CSSProperties}>
              <TokenIcon token={seat.token} color={colorHex(seat.color)} size={26} />
              <span className="reaction-name">{seat.name}</span>
              <span className="reaction-text">{REACTIONS[r.reaction]}</span>
            </div>
          );
        })}
        {chatPopups.map((m) => {
          const seat = room.seats[m.seat];
          return (
            <button
              key={`chat-${m.id}`}
              type="button"
              className="reaction-bubble chat-bubble"
              style={{ '--player': colorHex(m.color) } as CSSProperties}
              title={t.chatLabel}
              onClick={onOpenChat}
            >
              {seat && <TokenIcon token={seat.token} color={colorHex(m.color)} size={26} />}
              <span className="reaction-name">{m.name}</span>
              <span className="chat-bubble-text">{m.text}</span>
            </button>
          );
        })}
      </div>

      {onSend && (
        <div className="reactions">
          {open && (
            <div className="reaction-palette" role="group" aria-label={t.reactionsLabel}>
              {(Object.keys(REACTIONS) as ReactionId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`reaction-choice${REACTIONS[id].length > 2 ? ' phrase' : ''}`}
                  onClick={() => {
                    onSend(id);
                    setOpen(false);
                  }}
                >
                  {REACTIONS[id]}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className={`reaction-button${open ? ' open' : ''}`}
            aria-label={t.reactionsLabel}
            title={t.reactionsLabel}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            😊
          </button>
        </div>
      )}
    </>
  );
}
