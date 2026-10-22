import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLang } from '../i18n/LangContext';
import { CHAT_MAX_LENGTH, type RoomView } from '../net/protocol';
import { colorHex } from './look';

interface Props {
  room: RoomView;
  onSend: ((text: string) => void) | null; // null when only watching
  besideReactions: boolean; // in a game the 😊 button is in the corner, so this one sits next to it
}

/**
 * Online chat: a 💬 button (with the number of unread messages) that opens the room's recent
 * messages and a box to write in. Messages are shown as plain text.
 */
export function ChatBox({ room, onSend, besideReactions }: Props) {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const messages = room.chat;
  const lastId = messages.at(-1)?.id ?? 0;
  // Messages from before this screen opened don't count as unread.
  const [seenId, setSeenId] = useState(lastId);
  const unread = messages.filter((m) => m.id > seenId && m.seat !== room.you).length;
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!open) return;
    setSeenId(lastId);
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [open, lastId]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!onSend || text.trim() === '') return;
    onSend(text);
    setText('');
  };

  const time = (at: number) =>
    new Date(at).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`chat${besideReactions ? ' beside' : ''}`}>
      {open && (
        <section className="chat-panel" aria-label={t.chatLabel}>
          <header className="chat-header">
            <h2>{t.chatLabel}</h2>
            <button className="icon-button" aria-label={t.close} title={t.close} onClick={() => setOpen(false)}>
              ✕
            </button>
          </header>
          <ol className="chat-list" ref={list} aria-live="polite">
            {messages.length === 0 && <li className="muted chat-empty">{t.chatEmpty}</li>}
            {messages.map((m) => (
              <li key={m.id} className={`chat-message${m.seat === room.you ? ' mine' : ''}`}>
                <span className="chat-meta">
                  <strong style={{ color: colorHex(m.color) }}>{m.name}</strong> <span className="muted">{time(m.at)}</span>
                </span>
                <span className="chat-text">{m.text}</span>
              </li>
            ))}
          </ol>
          {onSend && (
            <form className="chat-form" onSubmit={send}>
              <input
                value={text}
                maxLength={CHAT_MAX_LENGTH}
                placeholder={t.chatPlaceholder}
                aria-label={t.chatPlaceholder}
                enterKeyHint="send"
                onChange={(e) => setText(e.target.value)}
                autoFocus
              />
              <button type="submit" className="primary" disabled={text.trim() === ''}>
                {t.chatSend}
              </button>
            </form>
          )}
        </section>
      )}
      <button
        type="button"
        className={`chat-button${open ? ' open' : ''}`}
        aria-label={unread > 0 ? `${t.chatLabel} (${unread})` : t.chatLabel}
        title={t.chatLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        💬
        {unread > 0 && !open && <span className="chat-unread">{unread > 9 ? '9+' : unread}</span>}
      </button>
    </div>
  );
}
