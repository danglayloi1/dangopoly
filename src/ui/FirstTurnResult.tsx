import type { CSSProperties } from 'react';
import { useLang } from '../i18n/LangContext';
import type { FirstTurnRound, SeatView } from '../net/protocol';
import { Dice } from './Dice';
import { colorHex } from './look';
import { TokenIcon } from './TokenIcon';
import { useModalDialog } from './useModalDialog';

/**
 * Online: the room server rolled for who goes first; every phone shows the same dice. Seats are
 * already in playing order, so seat 0 is the winner.
 */
export function FirstTurnResult({ rounds, seats, onClose }: { rounds: FirstTurnRound[]; seats: SeatView[]; onClose: () => void }) {
  const { t } = useLang();
  const { dialogProps, close } = useModalDialog(onClose);
  const total = (d: [number, number]) => d[0] + d[1];

  return (
    <dialog {...dialogProps} className="first-turn-dialog" aria-labelledby="first-turn-result-title">
      <header className="first-turn-header">
        <h2 id="first-turn-result-title">{t.whoFirst}</h2>
      </header>
      <p className="muted">{t.firstTurnHint}</p>
      {rounds.map((round, r) => {
        const best = Math.max(...round.map((x) => total(x.dice)));
        const leaders = round.filter((x) => total(x.dice) === best);
        return (
          <div key={r} className="first-turn-round">
            <ul className="first-turn-list">
              {round.map(({ seat, dice }) => {
                const s = seats[seat];
                const won = r === rounds.length - 1 && seat === 0;
                const out = total(dice) < best;
                return (
                  <li key={seat} className={`first-turn-row${won ? ' winner' : out ? ' out' : ''}`} style={{ '--player': colorHex(s.color) } as CSSProperties}>
                    <TokenIcon token={s.token} color={colorHex(s.color)} size={34} />
                    <span className="first-turn-name">{s.name}</span>
                    <Dice dice={dice} />
                    <strong className="first-turn-total">{total(dice)}</strong>
                  </li>
                );
              })}
            </ul>
            {leaders.length > 1 && <p className="first-turn-tie">{t.firstTurnTie(leaders.map((x) => seats[x.seat].name).join(', '))}</p>}
          </div>
        );
      })}
      <p className="first-turn-message" role="status">
        {t.firstTurnWinner(seats[0].name)}
      </p>
      <ol className="first-turn-order" aria-label={t.playOrder}>
        {seats.map((s, i) => (
          <li key={i}>{s.name}</li>
        ))}
      </ol>
      <div className="first-turn-actions">
        <button className="primary big" onClick={close} autoFocus>
          {t.letsPlay} →
        </button>
      </div>
    </dialog>
  );
}
