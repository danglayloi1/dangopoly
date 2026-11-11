import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { mauMeBotAction } from '../../games/maume/bot';
import { COLOR_HEX, COLOR_INK, COLOR_SHAPES, faceOf, FACE_WILD4, isWild, type Card } from '../../games/maume/cards';
import { applyMauMe, canDraw, canPass, NOTHING_DRAWN, playableCards, type MauMeAction, type MauMeLog, type MauMeState } from '../../games/maume/game';
import { cardName, faceName, MAUME_TEXT, type MauMeText } from '../../games/maume/text';
import { useLang } from '../../i18n/LangContext';
import { speedFactor } from '../animation';
import { ScreenTop } from '../Header';
import { Icon } from '../icons';
import { colorHex } from '../look';
import { playSound } from '../sound';
import '../tienlen/tienlen.css';
import '../eights/eights.css';
import { TokenIcon } from '../TokenIcon';
import { ColorCard, ColorCardBack } from './ColorCard';
import './maume.css';

const THINK_MS = 900;

export function logLine(mm: MauMeText, e: MauMeLog, state: MauMeState): string {
  const name = (i: number) => state.players[i].name;
  switch (e.type) {
    case 'dealt':
      return mm.dealt(e.game, cardName(mm, e.first));
    case 'played':
      return e.color === undefined ? mm.played(name(e.player), cardName(mm, e.card)) : mm.playedWild(name(e.player), cardName(mm, e.card), mm.colors[e.color]);
    case 'drew':
      return e.forced ? mm.forcedDraw(name(e.player), e.count) : mm.drew(name(e.player), e.count);
    case 'passed':
      return mm.passed(name(e.player));
    case 'skipped':
      return mm.skipped(name(e.player));
    case 'reversed':
      return mm.reversed;
    case 'lastCard':
      return mm.lastCard(name(e.player));
    case 'reshuffled':
      return mm.reshuffled;
    case 'won':
      return mm.won(name(e.player), e.points);
  }
}

/** The entries added since the last one seen (found by value: online every update is a fresh copy). */
function freshEntries(lastSeen: string | null, log: readonly MauMeLog[]): MauMeLog[] {
  if (lastSeen === null) return [];
  for (let i = log.length - 1; i >= 0; i--) if (JSON.stringify(log[i]) === lastSeen) return log.slice(i + 1);
  return [];
}

/** A game of Màu Mè against the computer, on this device: you are the first player. */
export function MauMeScreen({ initial, onLeave }: { initial: MauMeState; onLeave: () => void }) {
  const { uiLang } = useLang();
  const [state, setState] = useState(initial);
  const act = (action: MauMeAction) => setState((s) => applyMauMe(s, action));

  // Computer players move after a short pause, so you can follow what they do.
  useEffect(() => {
    const action = mauMeBotAction(state);
    if (!action) return;
    const timer = setTimeout(() => act(action), THINK_MS * Math.max(speedFactor(), 0.3));
    return () => clearTimeout(timer);
  }, [state]);

  // Dev only: lets the screenshot script see and drive the game.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __maume?: unknown }).__maume = { get: () => state, act, set: setState };
  }, [state]);

  return <MauMeTable state={state} me={0} onAct={act} onLeave={onLeave} leaveLabel={MAUME_TEXT[uiLang].toMenu} canDeal />;
}

interface TableProps {
  state: MauMeState;
  me: number | null; // this device's player; null when only watching
  onAct: (action: MauMeAction) => void;
  onLeave: () => void;
  leaveLabel: string;
  canDeal: boolean; // may start the next game (online: only the host)
  waitingFor?: string; // online: who deals the next game, when it isn't you
  connected?: readonly boolean[]; // online: whose phone is connected
  title?: string; // instead of the game's name and number (a lesson)
  glow?: readonly Card[]; // cards in your hand a lesson points at
  showGameOver?: boolean; // false in a lesson: it ends with its own words
  top?: ReactNode;
  children?: ReactNode;
}

/** The table: the others along the top, the deck and the pile in the middle, your hand at the bottom. */
export function MauMeTable({
  state,
  me,
  onAct,
  onLeave,
  leaveLabel,
  canDeal,
  waitingFor,
  connected,
  title,
  glow = [],
  showGameOver = true,
  top,
  children,
}: TableProps) {
  const { t, uiLang } = useLang();
  const mm = MAUME_TEXT[uiLang];
  const [choosingColor, setChoosingColor] = useState<Card | null>(null); // a wild card waiting for its color
  const lastSeen = useRef<string | null>(JSON.stringify(state.log.at(-1) ?? null));

  // Sounds for what just happened.
  useEffect(() => {
    const fresh = freshEntries(lastSeen.current, state.log);
    lastSeen.current = JSON.stringify(state.log.at(-1) ?? null);
    if (fresh.some((e) => e.type === 'won')) playSound('win');
    else if (fresh.some((e) => (e.type === 'drew' && e.forced) || e.type === 'skipped')) playSound('thud');
    else if (fresh.some((e) => e.type === 'played' || e.type === 'drew' || e.type === 'dealt')) playSound('card');
  }, [state.log]);

  useEffect(() => setChoosingColor(null), [state.current, state.game]);

  const mine = me === null ? null : state.players[me];
  const myTurn = me !== null && state.phase === 'playing' && state.current === me;
  const playable = myTurn ? playableCards(state) : [];
  const upCard = state.pile[state.pile.length - 1];
  const turnOf = state.players[state.current];

  const playCard = (card: Card) => {
    if (isWild(card)) setChoosingColor(card);
    else onAct({ type: 'PLAY', card });
  };

  const colorWord = `${mm.colors[state.color]} ${COLOR_SHAPES[state.color]}`;
  const status =
    state.phase === 'over'
      ? mm.gameOver
      : !myTurn
        ? mm.thinking(turnOf.name)
        : state.drawn === NOTHING_DRAWN
          ? mm.nothingToDraw
          : state.drawn !== null
            ? mm.drewFits
            : state.draw > 0
              ? faceOf(upCard) === FACE_WILD4
                ? mm.mustDraw4(state.draw)
                : mm.mustDraw(state.draw)
              : isWild(upCard)
                ? mm.followColor(colorWord)
                : mm.follow(colorWord, faceName(mm, upCard));
  const statusPlayer = myTurn || state.phase === 'over' ? mine : turnOf;

  const others = state.players.map((p, i) => ({ p, i }));
  const seats = me === null ? others : [...others.slice(me + 1), ...others.slice(0, me)];
  const recent = state.log.slice(-4).reverse();

  return (
    <main className="tl-screen e8-screen mm-screen">
      <ScreenTop title={title ?? `${mm.name} · ${mm.game(state.game)}`} onBack={onLeave} />
      {top}

      <ul className="tl-opponents">
        {seats.map(({ p, i }) => (
          <li
            key={i}
            className={`tl-seat${state.current === i && state.phase === 'playing' ? ' current' : ''}${connected && !connected[i] ? ' away' : ''}`}
            style={{ '--player': colorHex(p.color) } as CSSProperties}
          >
            <TokenIcon token={p.token} color={colorHex(p.color)} size={34} />
            {state.current === i && state.phase === 'playing' && <span className="tl-turn-badge">▶ {mm.turnBadge}</span>}
            <span className="tl-seat-name">{p.name}</span>
            <span className="tl-seat-cards" aria-label={mm.cards(p.hand.length)}>
              {p.hand.length > 0 && (
                <span className="tl-mini-fan" aria-hidden="true">
                  {p.hand.slice(0, Math.min(p.hand.length, 5)).map((_, k) => (
                    <ColorCardBack key={k} style={{ '--k': k } as CSSProperties} />
                  ))}
                </span>
              )}
              <strong>{p.hand.length}</strong>
            </span>
            {p.hand.length === 1 && state.phase === 'playing' && <span className="badge mm-last">{mm.lastCardBadge}</span>}
            {connected && !connected[i] && <span className="badge badge-away">{t.offline}</span>}
          </li>
        ))}
      </ul>

      <section
        className="tl-table e8-table mm-table"
        aria-label={mm.table}
        style={{ '--now': COLOR_HEX[state.color], '--now-ink': COLOR_INK[state.color] } as CSSProperties}
      >
        <div className="e8-center">
          <button
            type="button"
            className="e8-deck mm-deck"
            onClick={() => onAct({ type: 'DRAW' })}
            disabled={!myTurn || !canDraw(state)}
            aria-label={`${mm.draw} · ${mm.deck(state.deck.length)}`}
            title={mm.draw}
          >
            {state.deck.length > 0 ? <ColorCardBack /> : <span className="pcard e8-empty" aria-hidden="true" />}
            <span className="e8-count">{state.deck.length}</span>
          </button>
          <div className="e8-pile" key={state.pile.length + state.game * 1000}>
            <ColorCard card={upCard} />
          </div>
          <div className="e8-info">
            <span className={`badge mm-color${isWild(upCard) ? ' called' : ''}`}>{mm.colorNow(colorWord)}</span>
            {state.draw > 0 && <span className="badge e8-penalty">{mm.penalty(state.draw)}</span>}
            <span className="e8-direction" aria-hidden="true">
              {state.direction === 1 ? '↻' : '↺'}
            </span>
          </div>
        </div>
        {state.phase === 'playing' ? (
          <p className={`tl-turn${myTurn ? ' mine' : ''}`} style={{ '--player': colorHex(turnOf.color) } as CSSProperties}>
            <TokenIcon token={turnOf.token} color={colorHex(turnOf.color)} size={26} />
            {myTurn ? mm.yourTurn : mm.turnOf(turnOf.name)}
          </p>
        ) : (
          <p className="tl-empty">{mm.gameOver}</p>
        )}
      </section>

      <ul className="tl-log" aria-live="polite">
        {recent.map((e, k) => (
          <li key={`${state.log.length - k}-${e.type}`}>{logLine(mm, e, state)}</li>
        ))}
      </ul>

      {mine && (
        <section className={`tl-me${myTurn ? ' current' : ''}`} style={{ '--player': colorHex(mine.color) } as CSSProperties}>
          <p className="tl-status" role="status">
            {statusPlayer && <TokenIcon token={statusPlayer.token} color={colorHex(statusPlayer.color)} size={24} />} {status}
            {mine.hand.length === 1 && state.phase === 'playing' && <span className="badge mm-last">{mm.lastCardBadge}</span>}
          </p>
          {choosingColor !== null ? (
            <div className="mm-color-picker" role="group" aria-label={mm.pickColor}>
              <p>{mm.pickColor}</p>
              {mm.colors.map((word, color) => (
                <button
                  key={color}
                  type="button"
                  className="mm-color-choice"
                  style={{ '--c': COLOR_HEX[color], '--on': COLOR_INK[color] } as CSSProperties}
                  onClick={() => {
                    onAct({ type: 'PLAY', card: choosingColor, color });
                    setChoosingColor(null);
                  }}
                >
                  <span aria-hidden="true">{COLOR_SHAPES[color]}</span> {word}
                </button>
              ))}
            </div>
          ) : (
            <div className="tl-hand" style={{ '--n': Math.max(mine.hand.length, 1) } as CSSProperties}>
              {mine.hand.map((c) => (
                <ColorCard
                  key={c}
                  card={c}
                  selected={c === state.drawn && myTurn}
                  disabled={!playable.includes(c)}
                  glow={glow.includes(c)}
                  onClick={() => playCard(c)}
                />
              ))}
            </div>
          )}
          {state.phase === 'playing' && (
            <div className="tl-actions">
              {choosingColor !== null ? (
                <button type="button" className="secondary" onClick={() => setChoosingColor(null)}>
                  {t.back}
                </button>
              ) : (
                <>
                  <button type="button" className="secondary" onClick={() => onAct({ type: 'PASS' })} disabled={!myTurn || !canPass(state)}>
                    {mm.pass}
                  </button>
                  <button type="button" className="primary" onClick={() => onAct({ type: 'DRAW' })} disabled={!myTurn || !canDraw(state)}>
                    {state.draw > 0 ? `${mm.draw} ${state.draw}` : mm.draw}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {state.phase === 'over' && showGameOver && (
        <GameOver
          state={state}
          mm={mm}
          onNext={canDeal ? () => onAct({ type: 'NEXT_GAME' }) : null}
          waitingFor={waitingFor}
          onLeave={onLeave}
          leaveLabel={leaveLabel}
        />
      )}
      {children}
    </main>
  );
}

interface GameOverProps {
  state: MauMeState;
  mm: MauMeText;
  onNext: (() => void) | null;
  waitingFor?: string;
  onLeave: () => void;
  leaveLabel: string;
}

/** After a game: who went out, and everyone's points so far; deal again (or wait for the host to) or leave. */
function GameOver({ state, mm, onNext, waitingFor, onLeave, leaveLabel }: GameOverProps) {
  const won = [...state.log].reverse().find((e) => e.type === 'won');
  const ranked = state.players.map((p, i) => ({ p, i })).sort((a, b) => state.scores[b.i] - state.scores[a.i]);
  return (
    <section className="tl-over" role="dialog" aria-label={mm.gameOver}>
      <div className="tl-over-card">
        <h2>
          <Icon name="trophy" /> {mm.gameOver}
        </h2>
        {won?.type === 'won' && <p className="e8-winner">{mm.winner(state.players[won.player].name, won.points)}</p>}
        <ol className="tl-ranking">
          {ranked.map(({ p, i }) => (
            <li key={i} style={{ '--player': colorHex(p.color) } as CSSProperties}>
              <span className="tl-rank-place">{won?.type === 'won' && won.player === i ? '★' : ''}</span>
              <TokenIcon token={p.token} color={colorHex(p.color)} size={28} />
              <span className="tl-rank-name">{p.name}</span>
              <span className="tl-rank-points">
                {mm.points}: <strong>{state.scores[i]}</strong>
              </span>
            </li>
          ))}
        </ol>
        {!onNext && waitingFor && <p className="muted tl-waiting">{mm.waitingDeal(waitingFor)}</p>}
        <div className="tl-over-actions">
          <button type="button" className="secondary" onClick={onLeave}>
            {leaveLabel}
          </button>
          {onNext && (
            <button type="button" className="primary big" onClick={onNext} autoFocus>
              {mm.nextGame} →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
