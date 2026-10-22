import { useState, type CSSProperties } from 'react';
import { useLang } from '../i18n/LangContext';
import { REACTIONS, type ReactionId, type RoomView } from '../net/protocol';
import type { ShownReaction } from '../net/useRoom';
import { colorHex } from './look';
import { TokenIcon } from './TokenIcon';

interface Props {
  room: RoomView;
  reactions: ShownReaction[];
  onSend: ((reaction: ReactionId) => void) | null; // null when only watching
}

/**
 * Online: a 😊 button in the corner opens quick reactions (emoji and Nghệ phrases); whatever anyone
 * sends floats up on every phone for a moment, with the sender's token and name.
 */
export function Reactions({ room, reactions, onSend }: Props) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

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
            onClick={() => setOpen((o) => !o)}
          >
            😊
          </button>
        </div>
      )}
    </>
  );
}
