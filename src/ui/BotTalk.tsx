import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameState, LogEntry } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { botTalk, type Talk } from './botLines';
import { playerColor } from './look';
import { newLogEntries } from './motion';
import { TokenIcon } from './TokenIcon';

const SHOWN_MS = 3_800;

interface Shown extends Talk {
  id: number;
}

/**
 * Computer players talking: after each move has played out on screen, the bots it concerned say
 * something in character, as speech bubbles at the top of the screen.
 */
export function BotTalk({ game, busy }: { game: GameState; busy: boolean }) {
  const { uiLang } = useLang();
  const [shown, setShown] = useState<Shown[]>([]);
  const seenLog = useRef(game.log);
  const pending = useRef<LogEntry[]>([]);
  const nextId = useRef(0);

  // Collect what happened; say it once the move has finished playing out.
  const fresh = newLogEntries(seenLog.current, game.log);
  if (game.log !== seenLog.current) {
    pending.current = [...pending.current, ...fresh];
    seenLog.current = game.log;
  }

  useEffect(() => {
    if (busy || pending.current.length === 0) return;
    const talks = botTalk(pending.current, game, uiLang === 'en' ? 'en' : 'vi');
    pending.current = [];
    if (talks.length === 0) return;
    const added = talks.map((talk) => ({ ...talk, id: nextId.current++ }));
    setShown((now) => [...now, ...added].slice(-3));
    // Each bubble leaves on its own timer (a newer one mustn't cancel an older one's).
    for (const a of added) setTimeout(() => setShown((now) => now.filter((s) => s.id !== a.id)), SHOWN_MS);
  }, [busy, game]);

  if (shown.length === 0) return null;
  return (
    <div className="bot-talk" aria-live="polite">
      {shown.map((s, i) => {
        const p = game.players[s.player];
        return (
          <div key={s.id} className="talk-bubble" style={{ '--player': playerColor(p), '--tilt': `${i % 2 ? 1.5 : -1.5}deg` } as CSSProperties}>
            <TokenIcon token={p.token} color={playerColor(p)} size={30} />
            <span>
              <strong>{p.name}</strong>
              <span className="talk-text">{s.text}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
