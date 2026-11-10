import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { eightsBotAction } from '../../games/eights/bot';
import {
  applyEights,
  canDraw,
  canPass,
  NOTHING_DRAWN,
  playableCards,
  RANK_EIGHT,
  type EightsAction,
  type EightsLog,
  type EightsState,
} from '../../games/eights/game';
import { EIGHTS_TEXT, type EightsText } from '../../games/eights/text';
import { cardName, RANKS, rankOf, SUITS, suitOf, type Card } from '../../games/tienlen/cards';
import { useLang } from '../../i18n/LangContext';
import { speedFactor } from '../animation';
import { ScreenTop } from '../Header';
import { Icon } from '../icons';
import { colorHex } from '../look';
import { playSound } from '../sound';
import { CardBack, PlayingCard } from '../tienlen/PlayingCard';
import '../tienlen/tienlen.css';
import { TokenIcon } from '../TokenIcon';
import './eights.css';

const THINK_MS = 900;

export function logLine(e8: EightsText, e: EightsLog, state: EightsState): string {
  const name = (i: number) => state.players[i].name;
  switch (e.type) {
    case 'dealt':
      return e8.dealt(e.game, cardName(e.first));
    case 'played':
      return e.suit === undefined ? e8.played(name(e.player), cardName(e.card)) : e8.playedEight(name(e.player), cardName(e.card), SUITS[e.suit]);
    case 'drew':
      return e.forced ? e8.forcedDraw(name(e.player), e.count) : e8.drew(name(e.player), e.count);
    case 'passed':
      return e8.passed(name(e.player));
    case 'skipped':
      return e8.skipped(name(e.player));
    case 'reversed':
      return e8.reversed;
    case 'reshuffled':
      return e8.reshuffled;
    case 'won':
      return e8.won(name(e.player), e.points);
  }
}

/** The entries added since the last one seen (found by value: online every update is a fresh copy). */
function freshEntries(lastSeen: string | null, log: readonly EightsLog[]): EightsLog[] {
  if (lastSeen === null) return [];
  for (let i = log.length - 1; i >= 0; i--) if (JSON.stringify(log[i]) === lastSeen) return log.slice(i + 1);
  return [];
}

/** A game of Crazy Eights against the computer, on this device: you are the first player. */
export function EightsScreen({ initial, onLeave }: { initial: EightsState; onLeave: () => void }) {
  const { uiLang } = useLang();
  const [state, setState] = useState(initial);
  const act = (action: EightsAction) => setState((s) => applyEights(s, action));

  // Computer players move after a short pause, so you can follow what they do.
  useEffect(() => {
    const action = eightsBotAction(state);
    if (!action) return;
    const timer = setTimeout(() => act(action), THINK_MS * Math.max(speedFactor(), 0.3));
    return () => clearTimeout(timer);
  }, [state]);

  // Dev only: lets the screenshot script see and drive the game.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __eights?: unknown }).__eights = { get: () => state, act };
  }, [state]);

  return <EightsTable state={state} me={0} onAct={act} onLeave={onLeave} leaveLabel={EIGHTS_TEXT[uiLang].toMenu} canDeal />;
}

interface TableProps {
  state: EightsState;
  me: number | null; // this device's player; null when only watching
  onAct: (action: EightsAction) => void;
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
export function EightsTable({
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
  const e8 = EIGHTS_TEXT[uiLang];
  const [choosingSuit, setChoosingSuit] = useState<Card | null>(null); // an 8 waiting for its suit
  const lastSeen = useRef<string | null>(JSON.stringify(state.log.at(-1) ?? null));

  // Sounds for what just happened.
  useEffect(() => {
    const fresh = freshEntries(lastSeen.current, state.log);
    lastSeen.current = JSON.stringify(state.log.at(-1) ?? null);
    if (fresh.some((e) => e.type === 'won')) playSound('win');
    else if (fresh.some((e) => (e.type === 'drew' && e.forced) || e.type === 'skipped')) playSound('thud');
    else if (fresh.some((e) => e.type === 'played' || e.type === 'drew' || e.type === 'dealt')) playSound('card');
  }, [state.log]);

  useEffect(() => setChoosingSuit(null), [state.current, state.game]);

  const mine = me === null ? null : state.players[me];
  const myTurn = me !== null && state.phase === 'playing' && state.current === me;
  const playable = myTurn ? playableCards(state) : [];
  const upCard = state.pile[state.pile.length - 1];
  const turnOf = state.players[state.current];

  const playCard = (card: Card) => {
    if (rankOf(card) === RANK_EIGHT) setChoosingSuit(card);
    else onAct({ type: 'PLAY', card });
  };

  const status =
    state.phase === 'over'
      ? e8.gameOver
      : !myTurn
        ? e8.thinking(turnOf.name)
        : state.drawn === NOTHING_DRAWN
          ? e8.nothingToDraw
          : state.drawn !== null
            ? e8.drewFits
            : state.draw > 0
              ? e8.mustDraw(state.draw)
              : e8.follow(e8.suits[state.suit], RANKS[rankOf(upCard)]);
  const statusPlayer = myTurn || state.phase === 'over' ? mine : turnOf;

  const others = state.players.map((p, i) => ({ p, i }));
  const seats = me === null ? others : [...others.slice(me + 1), ...others.slice(0, me)];
  const recent = state.log.slice(-4).reverse();

  return (
    <main className="tl-screen e8-screen">
      <ScreenTop title={title ?? `${e8.name} · ${e8.game(state.game)}`} onBack={onLeave} />
      {top}

      <ul className="tl-opponents">
        {seats.map(({ p, i }) => (
          <li
            key={i}
            className={`tl-seat${state.current === i && state.phase === 'playing' ? ' current' : ''}${connected && !connected[i] ? ' away' : ''}`}
            style={{ '--player': colorHex(p.color) } as CSSProperties}
          >
            <TokenIcon token={p.token} color={colorHex(p.color)} size={34} />
            {state.current === i && state.phase === 'playing' && <span className="tl-turn-badge">▶ {e8.turnBadge}</span>}
            <span className="tl-seat-name">{p.name}</span>
            <span className="tl-seat-cards" aria-label={e8.cards(p.hand.length)}>
              {p.hand.length > 0 && (
                <span className="tl-mini-fan" aria-hidden="true">
                  {p.hand.slice(0, Math.min(p.hand.length, 5)).map((_, k) => (
                    <CardBack key={k} style={{ '--k': k } as CSSProperties} />
                  ))}
                </span>
              )}
              <strong>{p.hand.length}</strong>
            </span>
            {connected && !connected[i] && <span className="badge badge-away">{t.offline}</span>}
          </li>
        ))}
      </ul>

      <section className="tl-table e8-table" aria-label={e8.table}>
        <div className="e8-center">
          <button
            type="button"
            className="e8-deck"
            onClick={() => onAct({ type: 'DRAW' })}
            disabled={!myTurn || !canDraw(state)}
            aria-label={`${e8.draw} · ${e8.deck(state.deck.length)}`}
            title={e8.draw}
          >
            {state.deck.length > 0 ? <CardBack /> : <span className="pcard e8-empty" aria-hidden="true" />}
            <span className="e8-count">{state.deck.length}</span>
          </button>
          <div className="e8-pile" key={state.pile.length + state.game * 100}>
            <PlayingCard card={upCard} />
          </div>
          <div className="e8-info">
            <span className={`badge e8-suit${suitOf(upCard) !== state.suit ? ' called' : ''}${state.suit >= 2 ? ' red' : ''}`}>
              {e8.calledSuit(`${SUITS[state.suit]} ${e8.suits[state.suit]}`)}
            </span>
            {state.draw > 0 && <span className="badge e8-penalty">{e8.penalty(state.draw)}</span>}
            <span className="e8-direction" aria-hidden="true">
              {state.direction === 1 ? '↻' : '↺'}
            </span>
          </div>
        </div>
        {state.phase === 'playing' ? (
          <p className={`tl-turn${myTurn ? ' mine' : ''}`} style={{ '--player': colorHex(turnOf.color) } as CSSProperties}>
            <TokenIcon token={turnOf.token} color={colorHex(turnOf.color)} size={26} />
            {myTurn ? e8.yourTurn : e8.turnOf(turnOf.name)}
          </p>
        ) : (
          <p className="tl-empty">{e8.gameOver}</p>
        )}
      </section>

      <ul className="tl-log" aria-live="polite">
        {recent.map((e, k) => (
          <li key={`${state.log.length - k}-${e.type}`}>{logLine(e8, e, state)}</li>
        ))}
      </ul>

      {mine && (
        <section className={`tl-me${myTurn ? ' current' : ''}`} style={{ '--player': colorHex(mine.color) } as CSSProperties}>
          <p className="tl-status" role="status">
            {statusPlayer && <TokenIcon token={statusPlayer.token} color={colorHex(statusPlayer.color)} size={24} />} {status}
          </p>
          {choosingSuit !== null ? (
            <div className="e8-suit-picker" role="group" aria-label={e8.pickSuit}>
              <p>{e8.pickSuit}</p>
              {SUITS.map((symbol, suit) => (
                <button
                  key={suit}
                  type="button"
                  className={`e8-suit-choice${suit >= 2 ? ' red' : ''}`}
                  onClick={() => {
                    onAct({ type: 'PLAY', card: choosingSuit, suit });
                    setChoosingSuit(null);
                  }}
                >
                  <span aria-hidden="true">{symbol}</span> {e8.suits[suit]}
                </button>
              ))}
            </div>
          ) : (
            <div className="tl-hand" style={{ '--n': Math.max(mine.hand.length, 1) } as CSSProperties}>
              {mine.hand.map((c) => (
                <PlayingCard
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
              {choosingSuit !== null ? (
                <button type="button" className="secondary" onClick={() => setChoosingSuit(null)}>
                  {t.back}
                </button>
              ) : (
                <>
                  <button type="button" className="secondary" onClick={() => onAct({ type: 'PASS' })} disabled={!myTurn || !canPass(state)}>
                    {e8.pass}
                  </button>
                  <button type="button" className="primary" onClick={() => onAct({ type: 'DRAW' })} disabled={!myTurn || !canDraw(state)}>
                    {state.draw > 0 ? `${e8.draw} ${state.draw}` : e8.draw}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {state.phase === 'over' && showGameOver && (
        <GameOver state={state} e8={e8} onNext={canDeal ? () => onAct({ type: 'NEXT_GAME' }) : null} waitingFor={waitingFor} onLeave={onLeave} leaveLabel={leaveLabel} />
      )}
      {children}
    </main>
  );
}

interface GameOverProps {
  state: EightsState;
  e8: EightsText;
  onNext: (() => void) | null;
  waitingFor?: string;
  onLeave: () => void;
  leaveLabel: string;
}

/** After a game: who went out, and everyone's points so far; deal again (or wait for the host to) or leave. */
function GameOver({ state, e8, onNext, waitingFor, onLeave, leaveLabel }: GameOverProps) {
  const won = [...state.log].reverse().find((e) => e.type === 'won');
  const ranked = state.players.map((p, i) => ({ p, i })).sort((a, b) => state.scores[b.i] - state.scores[a.i]);
  return (
    <section className="tl-over" role="dialog" aria-label={e8.gameOver}>
      <div className="tl-over-card">
        <h2>
          <Icon name="trophy" /> {e8.gameOver}
        </h2>
        {won?.type === 'won' && <p className="e8-winner">{e8.winner(state.players[won.player].name, won.points)}</p>}
        <ol className="tl-ranking">
          {ranked.map(({ p, i }) => (
            <li key={i} style={{ '--player': colorHex(p.color) } as CSSProperties}>
              <span className="tl-rank-place">{won?.type === 'won' && won.player === i ? '★' : ''}</span>
              <TokenIcon token={p.token} color={colorHex(p.color)} size={28} />
              <span className="tl-rank-name">{p.name}</span>
              <span className="tl-rank-points">
                {e8.points}: <strong>{state.scores[i]}</strong>
              </span>
            </li>
          ))}
        </ol>
        {!onNext && waitingFor && <p className="muted tl-waiting">{e8.waitingDeal(waitingFor)}</p>}
        <div className="tl-over-actions">
          <button type="button" className="secondary" onClick={onLeave}>
            {leaveLabel}
          </button>
          {onNext && (
            <button type="button" className="primary big" onClick={onNext} autoFocus>
              {e8.nextGame} →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
