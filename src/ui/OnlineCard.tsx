import { useState, type FormEvent } from 'react';
import { useLang } from '../i18n/LangContext';
import { isRoomCode, normalizeRoomCode } from '../net/protocol';
import { lastRoom } from '../net/seats';

/** On the start screen: create a room for an online game, or join one with its code. */
export function OnlineCard({ onCreateRoom, onJoinRoom }: { onCreateRoom: () => void; onJoinRoom: (code: string) => void }) {
  const { t } = useLang();
  const [text, setText] = useState('');
  const [badCode, setBadCode] = useState(false);
  const [last] = useState(lastRoom);

  const join = (e: FormEvent) => {
    e.preventDefault();
    const code = normalizeRoomCode(text);
    if (isRoomCode(code)) onJoinRoom(code);
    else setBadCode(true);
  };

  return (
    <section className="setup-card online-card">
      <h2>🌐 {t.online}</h2>
      <p className="muted">{t.onlineIntro}</p>
      <div className="online-actions">
        <button type="button" className="primary" onClick={onCreateRoom}>
          {t.createRoom}
        </button>
        <form className="join-form" onSubmit={join} noValidate>
          <input
            value={text}
            placeholder="ABC234"
            aria-label={t.roomCode}
            aria-invalid={badCode}
            aria-describedby={badCode ? 'room-code-error' : undefined}
            className={badCode ? 'invalid' : ''}
            maxLength={9}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setText(e.target.value);
              setBadCode(false);
            }}
          />
          <button type="submit" className="secondary">
            {t.joinRoom}
          </button>
        </form>
      </div>
      {badCode && (
        <p id="room-code-error" className="form-error">
          {t.badCode}
        </p>
      )}
      {last && (
        <button type="button" className="link" onClick={() => onJoinRoom(last)}>
          {t.rejoinRoom(last)} →
        </button>
      )}
    </section>
  );
}
