import { useEffect, useState, type CSSProperties } from 'react';
import { defaultPlayerColor } from '../data/colors';
import type { NewPlayer } from '../engine/game';
import type { Dice as DiceValues } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { Dice } from './Dice';
import { orderFrom } from './firstTurn';
import { colorHex } from './look';
import { playSound } from './sound';
import { TokenIcon } from './TokenIcon';
import { useModalDialog } from './useModalDialog';
import { Icon } from './icons';

interface Props {
  players: NewPlayer[];
  onDone: (ordered: NewPlayer[]) => void;
  onClose: () => void;
}

const ROLL_MS = 700;
const die = () => 1 + Math.floor(Math.random() * 6);
const total = (d: DiceValues) => d[0] + d[1];
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Before the game: everyone rolls two dice, highest total goes first. Players who tie for the
 * highest roll again, until one is left. (A dice roll here is just for fun, so it isn't part of
 * the game's seeded random numbers.)
 */
export function FirstTurnDialog({ players, onDone, onClose }: Props) {
  const { t } = useLang();
  const { dialogProps, close } = useModalDialog(onClose);
  const [contenders, setContenders] = useState(() => players.map((_, i) => i));
  const [rolls, setRolls] = useState<(DiceValues | null)[]>(() => players.map(() => null));
  const [rolling, setRolling] = useState<number | null>(null);

  const next = contenders.find((i) => rolls[i] === null);
  const allRolled = next === undefined && rolling === null;
  const best = allRolled ? Math.max(...contenders.map((i) => total(rolls[i]!))) : 0;
  const leaders = allRolled ? contenders.filter((i) => total(rolls[i]!) === best) : [];
  const winner = leaders.length === 1 ? leaders[0] : null;
  const tied = leaders.length > 1 ? leaders : null;

  const roll = (i: number) => {
    playSound('dice');
    setRolling(i);
    setTimeout(
      () => {
        setRolls((prev) => prev.map((r, j) => (j === i ? [die(), die()] : r)));
        setRolling(null);
      },
      reducedMotion() ? 0 : ROLL_MS,
    );
  };

  // Computer players roll for themselves, after a moment.
  const botNext = next !== undefined && rolling === null && players[next].bot !== undefined;
  useEffect(() => {
    if (!botNext) return;
    const timer = setTimeout(() => roll(next!), reducedMotion() ? 0 : 500);
    return () => clearTimeout(timer);
  }, [botNext, next]);

  const rollAgain = (between: number[]) => {
    setContenders(between);
    setRolls((prev) => prev.map((r, j) => (between.includes(j) ? null : r)));
    roll(between[0]);
  };

  const names = (list: number[]) => list.map((i) => players[i].name).join(', ');
  const colorOf = (i: number) => colorHex(players[i].color ?? defaultPlayerColor(i));
  const ordered = winner === null ? null : orderFrom(players, winner);

  return (
    <dialog {...dialogProps} className="first-turn-dialog" aria-labelledby="first-turn-title">
      <header className="first-turn-header">
        <h2 id="first-turn-title">{t.whoFirst}</h2>
        <button className="icon-button" aria-label={t.close} title={t.close} onClick={close}>
          ✕
        </button>
      </header>
      <p className="muted">{t.firstTurnHint}</p>

      <ul className="first-turn-list">
        {players.map((p, i) => {
          const state =
            i === winner ? ' winner' : !contenders.includes(i) || (allRolled && !leaders.includes(i)) ? ' out' : i === next ? ' up' : '';
          const r = rolls[i];
          return (
            <li key={i} className={`first-turn-row${state}`} style={{ '--player': colorOf(i) } as CSSProperties}>
              <TokenIcon token={p.token} color={colorOf(i)} size={34} />
              <span className="first-turn-name">{p.name}</span>
              <Dice dice={r} rolling={rolling === i} />
              <strong className="first-turn-total">{r && rolling !== i ? total(r) : ''}</strong>
            </li>
          );
        })}
      </ul>

      <p className="first-turn-message" role="status">
        {winner !== null && t.firstTurnWinner(players[winner].name)}
        {tied && t.firstTurnTie(names(tied))}
      </p>

      {ordered && (
        <ol className="first-turn-order" aria-label={t.playOrder}>
          {ordered.map((p, i) => (
            <li key={i}>{p.name}</li>
          ))}
        </ol>
      )}

      <div className="first-turn-actions">
        {next !== undefined && (
          <button className="primary big" disabled={rolling !== null || botNext} onClick={() => roll(next)} autoFocus>
            <Icon name="dice" /> {t.rollForFirst(players[next].name)}
          </button>
        )}
        {tied && (
          <button className="primary big" onClick={() => rollAgain(tied)} autoFocus>
            <Icon name="dice" /> {t.rollForFirst(players[tied[0]].name)}
          </button>
        )}
        {ordered && (
          <button className="primary big" onClick={() => onDone(ordered)} autoFocus>
            {t.letsPlay} →
          </button>
        )}
        {!ordered && (
          <button className="secondary" onClick={() => onDone(players)}>
            {t.skipFirstRoll}
          </button>
        )}
      </div>
    </dialog>
  );
}
