import { useState, type CSSProperties } from 'react';
import { MISSION_REWARD } from '../engine/missions';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { Icon } from './icons';
import { playerColor } from './look';
import { TokenIcon } from './TokenIcon';
import { useModalDialog } from './useModalDialog';
import { useViewer } from './viewer';

/**
 * Secret missions. Online, this phone's own missions. On one shared device: choose whose, then a
 * "pass the device, everyone else look away" step, then the missions, so nobody sees another's.
 */
export function MissionsDialog({ game, onClose }: { game: GameState; onClose: () => void }) {
  const { t } = useLang();
  const viewer = useViewer();
  const { dialogProps, close } = useModalDialog(onClose);
  const people = game.players.filter((p) => !p.bot && !p.bankrupt && p.missions);
  const [who, setWho] = useState<number | null>(viewer.online ? viewer.seat : people.length === 1 ? people[0].id : null);
  const [revealed, setRevealed] = useState(viewer.online);
  const player = who === null ? null : game.players[who];

  return (
    <dialog {...dialogProps} className="missions-dialog" aria-labelledby="missions-title">
      <header className="summary-header">
        <h2 id="missions-title">{t.missionsTitle}</h2>
        <button className="icon-button" aria-label={t.close} title={t.close} onClick={close}>
          ✕
        </button>
      </header>
      <div className="missions-body">
        {player === null && (
          <>
            <p>{t.missionsWhose}</p>
            {people.map((p) => (
              <button key={p.id} className="secondary mission-who" style={{ '--player': playerColor(p) } as CSSProperties} onClick={() => setWho(p.id)}>
                <TokenIcon token={p.token} color={playerColor(p)} size={28} /> {p.name}
              </button>
            ))}
          </>
        )}

        {player && !revealed && (
          <div className="mission-pass">
            <TokenIcon token={player.token} color={playerColor(player)} size={56} />
            <p>{t.missionsPass(player.name)}</p>
            <button className="primary big" onClick={() => setRevealed(true)}>
              <Icon name="eye" /> {t.missionsReveal}
            </button>
          </div>
        )}

        {player && revealed && (
          <>
            <ul className="mission-list">
              {(player.missions ?? []).map((m, i) =>
                m.id === null ? null : (
                  <li key={i} className={m.done ? 'done' : ''}>
                    <span className="mission-mark" aria-hidden="true">
                      {m.done ? '✓' : <Icon name="scroll" />}
                    </span>
                    <span>
                      <strong>{t.missions[m.id].name}</strong>
                      <span>{t.missions[m.id].how}</span>
                    </span>
                  </li>
                ),
              )}
            </ul>
            <p className="muted small-note">{t.missionsReward(formatMoney(MISSION_REWARD))}</p>
            <button className="secondary" onClick={close}>
              {t.close}
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
