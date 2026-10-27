import { useEffect, useState, type CSSProperties } from 'react';
import { useLang } from '../i18n/LangContext';
import { REACTIONS, THROW_ITEMS, type ChatMessage, type ReactionId, type RoomView, type ThrowItem } from '../net/protocol';
import { Icon, type IconName } from './icons';
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
  onThrow: ((target: number, item: ThrowItem) => void) | null; // in a game: throw something at someone
}

const ITEM_ICONS: Record<ThrowItem, IconName> = { dep: 'slipper', banhChung: 'banhChung', hoa: 'blossom' };

/**
 * Online: a 😊 button in the corner opens quick reactions (emoji and Nghệ phrases); whatever anyone
 * sends floats up on every phone for a moment, with the sender's token and name. New chat messages
 * float up the same way.
 */
export function Reactions({ room, reactions, onSend, open, onOpenChange, chatPopups, onOpenChat, onThrow }: Props) {
  const { t } = useLang();
  // Throwing: first the thing, then who at.
  const [aiming, setAiming] = useState<ThrowItem | null>(null);
  useEffect(() => {
    if (!open) setAiming(null); // closed some other way (e.g. the chat opened): start over next time
  }, [open]);
  const setOpen = (next: boolean) => {
    setAiming(null);
    onOpenChange(next);
  };
  const targets = room.seats.flatMap((s, i) => (i === room.you ? [] : [{ seat: i, ...s }]));

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
              {onThrow && aiming && (
                <div className="throw-targets">
                  <p>{t.throwAt(t.throwItems[aiming])}</p>
                  {targets.map((s) => (
                    <button
                      key={s.seat}
                      type="button"
                      className="throw-target"
                      style={{ '--player': colorHex(s.color) } as CSSProperties}
                      onClick={() => {
                        onThrow(s.seat, aiming);
                        setOpen(false);
                      }}
                    >
                      <TokenIcon token={s.token} color={colorHex(s.color)} size={26} />
                      {s.name}
                    </button>
                  ))}
                  <button type="button" className="link" onClick={() => setAiming(null)}>
                    ← {t.back}
                  </button>
                </div>
              )}
              {onThrow && !aiming && targets.length > 0 && (
                <div className="throw-row">
                  <span>{t.throwLabel}:</span>
                  {THROW_ITEMS.map((item) => (
                    <button key={item} type="button" className="throw-choice" title={t.throwItems[item]} aria-label={`${t.throwLabel} ${t.throwItems[item]}`} onClick={() => setAiming(item)}>
                      <Icon name={ITEM_ICONS[item]} size={26} />
                    </button>
                  ))}
                </div>
              )}
              {!aiming && (Object.keys(REACTIONS) as ReactionId[]).map((id) => (
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
