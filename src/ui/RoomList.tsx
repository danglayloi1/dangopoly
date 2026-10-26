import { useEffect, useState, type CSSProperties } from 'react';
import { MAX_PLAYERS } from '../engine/game';
import { useLang } from '../i18n/LangContext';
import type { RoomListing } from '../net/protocol';
import { fetchRoomList } from '../net/roomList';
import { Icon } from './icons';
import { colorHex } from './look';
import { TokenIcon } from './TokenIcon';

const REFRESH_MS = 5_000;

/**
 * The rooms open right now (the ones their hosts list publicly): join one that's waiting for
 * players, or watch any of them. Refreshed every few seconds while the screen is visible.
 */
export function RoomList({ onOpen }: { onOpen: (code: string) => void }) {
  const { t } = useLang();
  const [rooms, setRooms] = useState<RoomListing[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [asked, setAsked] = useState(0); // the refresh button asks again

  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      if (document.hidden) return;
      fetchRoomList(controller.signal)
        .then((list) => {
          setRooms(list);
          setFailed(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [asked]);

  return (
    <section className="setup-card room-list" aria-labelledby="room-list-title">
      <header className="room-list-header">
        <h2 id="room-list-title">{t.roomListTitle}</h2>
        <button type="button" className="secondary small" onClick={() => setAsked((n) => n + 1)}>
          {t.roomListRefresh}
        </button>
      </header>

      {failed && <p className="form-error">{t.roomListError}</p>}
      {rooms === null && !failed && <p className="muted">{t.roomListLoading}</p>}
      {rooms?.length === 0 && <p className="muted">{t.roomListEmpty}</p>}

      {rooms && rooms.length > 0 && (
        <ul className="room-rows">
          {rooms.map((r) => {
            const canJoin = r.stage === 'lobby' && r.players.length < MAX_PLAYERS;
            return (
              <li key={r.code} className={`room-row stage-${r.stage}`}>
                <div className="room-tokens" aria-hidden="true">
                  {r.players.map((p, i) => (
                    <span key={i} className={p.online ? '' : 'away'} style={{ '--player': colorHex(p.color) } as CSSProperties}>
                      <TokenIcon token={p.token} color={colorHex(p.color)} size={28} />
                    </span>
                  ))}
                </div>
                <div className="room-info">
                  <strong>{t.roomOf(r.host)}</strong>
                  <span className="room-meta">
                    <span className={`room-stage ${r.stage}`}>{t.roomStages[r.stage]}</span>
                    {t.roomPlayers(r.players.length, MAX_PLAYERS)}
                    {r.round !== null && ` · ${t.roundOf(r.round, null)}`}
                    {r.watchers > 0 && (
                      <>
                        {' · '}
                        <Icon name="eye" /> {r.watchers}
                      </>
                    )}
                    <span className="room-code-small"> · {r.code}</span>
                  </span>
                </div>
                <div className="room-actions">
                  {canJoin && (
                    <button type="button" className="primary small" onClick={() => onOpen(r.code)}>
                      {t.roomJoin}
                    </button>
                  )}
                  <button type="button" className="secondary small" onClick={() => onOpen(r.code)}>
                    <Icon name="eye" /> {t.roomWatch}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
