import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { tienLenBotAction } from '../../games/tienlen/bot';
import { cardName, type Card } from '../../games/tienlen/cards';
import { comboOf, type Combo } from '../../games/tienlen/combos';
import { applyTienLen, canPass, legalPlays, type TienLenAction, type TienLenLog, type TienLenState } from '../../games/tienlen/game';
import { placeName, TIENLEN_TEXT, type TienLenText } from '../../games/tienlen/text';
import { useLang } from '../../i18n/LangContext';
import { speedFactor } from '../animation';
import { ScreenTop } from '../Header';
import { Icon } from '../icons';
import { colorHex } from '../look';
import { playSound } from '../sound';
import { TokenIcon } from '../TokenIcon';
import { CardBack, PlayingCard } from './PlayingCard';
import './tienlen.css';

const THINK_MS = 900;

/** A play in words: "Đôi 7♣ 7♥". */
const describe = (tl: TienLenText, cards: readonly Card[], kind: Combo['kind']) => `${tl.kinds[kind]} ${cards.map(cardName).join(' ')}`;

export function logLine(tl: TienLenText, e: TienLenLog, state: TienLenState): string {
  const name = (i: number) => state.players[i].name;
  switch (e.type) {
    case 'dealt':
      return tl.dealt(e.game);
    case 'played':
      return (e.chop ? tl.chopped : tl.played)(name(e.player), describe(tl, e.cards, e.kind));
    case 'passed':
      return tl.passedLog(name(e.player));
    case 'roundWon':
      return tl.roundWon(name(e.player));
    case 'finished':
      return tl.finished(name(e.player), placeName(tl, e.place, state.players.length));
    case 'instantWin':
      return tl.instantWin(name(e.player), tl.instant[e.how]);
    case 'gameOver':
      return tl.gameOver;
  }
}

/**
 * The log entries added since the last one seen. Online every update is a fresh copy of the log (and
 * it's trimmed once it's long), so the last entry seen is found by value, from the end.
 */
function freshEntries(lastSeen: string | null, log: readonly TienLenLog[]): TienLenLog[] {
  if (lastSeen === null) return [];
  for (let i = log.length - 1; i >= 0; i--) if (JSON.stringify(log[i]) === lastSeen) return log.slice(i + 1);
  return [];
}

/** A game of Tiến lên against the computer, on this device: you are the first player. */
export function TienLenScreen({ initial, onLeave }: { initial: TienLenState; onLeave: () => void }) {
  const { uiLang } = useLang();
  const [state, setState] = useState(initial);
  const act = (action: TienLenAction) => setState((s) => applyTienLen(s, action));

  // Computer players move after a short pause, so you can follow what they do.
  useEffect(() => {
    const action = tienLenBotAction(state);
    if (!action) return;
    const timer = setTimeout(() => act(action), THINK_MS * Math.max(speedFactor(), 0.3));
    return () => clearTimeout(timer);
  }, [state]);

  // Dev only: lets the screenshot script see and drive the game.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __tienlen?: unknown }).__tienlen = { get: () => state, act };
  }, [state]);

  return <TienLenTable state={state} me={0} onAct={act} onLeave={onLeave} leaveLabel={TIENLEN_TEXT[uiLang].toMenu} canDeal />;
}

interface TableProps {
  state: TienLenState;
  me: number | null; // this device's player; null when only watching
  onAct: (action: TienLenAction) => void;
  onLeave: () => void;
  leaveLabel: string;
  canDeal: boolean; // may start the next game (online: only the host)
  waitingFor?: string; // online: who deals the next game, when it isn't you
  connected?: readonly boolean[]; // online: whose phone is connected
  title?: string; // instead of the game's name and number (a lesson)
  glow?: readonly Card[]; // cards in your hand a lesson points at
  showGameOver?: boolean; // false in a lesson: it ends with its own words
  top?: ReactNode; // under the title: the room's chip, a note for watchers…
  children?: ReactNode; // reactions, chat
}

/** The table: the others around the top, the play to beat in the middle, your hand at the bottom. */
export function TienLenTable({
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
  const tl = TIENLEN_TEXT[uiLang];
  const [selected, setSelected] = useState<Card[]>([]);
  const [hintIndex, setHintIndex] = useState(0);
  const lastSeen = useRef<string | null>(JSON.stringify(state.log.at(-1) ?? null));

  // Sounds for what just happened.
  useEffect(() => {
    const fresh = freshEntries(lastSeen.current, state.log);
    lastSeen.current = JSON.stringify(state.log.at(-1) ?? null);
    if (fresh.some((e) => e.type === 'gameOver' || e.type === 'instantWin')) playSound('win');
    else if (fresh.some((e) => e.type === 'played' && e.chop)) playSound('thud');
    else if (fresh.some((e) => e.type === 'played' || e.type === 'dealt')) playSound('card');
  }, [state.log]);

  const mine = me === null ? null : state.players[me];
  // A new game, or the hand changed under the selection: start the selection over.
  useEffect(() => {
    setSelected((sel) => sel.filter((c) => mine?.hand.includes(c)));
    setHintIndex(0);
  }, [mine?.hand.length, state.game]);

  const myTurn = me !== null && state.phase === 'playing' && state.current === me;
  const plays = useMemo(() => (myTurn ? legalPlays(state) : []), [state, myTurn]);
  // Hints: the cheapest plays first (lowest top card, then fewest cards).
  const hints = useMemo(() => [...plays].sort((a, b) => a.top - b.top || a.cards.length - b.cards.length), [plays]);
  const chosen = selected.length > 0 ? comboOf(selected) : null;
  const legal = chosen !== null && plays.some((p) => p.cards.length === chosen.cards.length && p.cards.every((c) => chosen.cards.includes(c)));

  const toggle = (card: Card) => setSelected((sel) => (sel.includes(card) ? sel.filter((c) => c !== card) : [...sel, card]));
  const hint = () => {
    if (hints.length === 0) return;
    setSelected(hints[hintIndex % hints.length].cards);
    setHintIndex((i) => i + 1);
  };
  const play = () => {
    if (!legal) return;
    onAct({ type: 'PLAY', cards: selected });
    setSelected([]);
  };

  // What to tell you now, and whose token goes with it.
  const problem =
    myTurn && selected.length > 0 && !legal
      ? !chosen
        ? tl.notCombo
        : state.mustInclude !== null && !selected.includes(state.mustInclude)
          ? tl.mustHave(cardName(state.mustInclude))
          : tl.tooLow
      : null;
  const turnOf = state.players[state.current];
  const status =
    state.phase === 'over'
      ? tl.gameOver
      : mine?.place != null
        ? tl.youAreOut(placeName(tl, mine.place, state.players.length))
        : myTurn
          ? (problem ?? (state.mustInclude !== null ? tl.mustInclude(cardName(state.mustInclude)) : state.table ? tl.beat : tl.lead))
          : tl.thinking(turnOf.name);
  const statusPlayer = myTurn || state.phase === 'over' || mine?.place != null ? mine : turnOf;

  // The others, in playing order after you (everyone, for a watcher).
  const others = state.players.map((p, i) => ({ p, i }));
  const seats = me === null ? others : [...others.slice(me + 1), ...others.slice(0, me)];
  const recent = state.log.slice(-4).reverse();
  const lastPlay = state.log.at(-1);

  return (
    <main className="tl-screen">
      <ScreenTop title={title ?? `${tl.name} · ${tl.game(state.game)}`} onBack={onLeave} />
      {top}

      <ul className="tl-opponents">
        {seats.map(({ p, i }) => (
          <li
            key={i}
            className={`tl-seat${state.current === i && state.phase === 'playing' ? ' current' : ''}${connected && !connected[i] ? ' away' : ''}`}
            style={{ '--player': colorHex(p.color) } as CSSProperties}
          >
            <TokenIcon token={p.token} color={colorHex(p.color)} size={34} />
            {state.current === i && state.phase === 'playing' && <span className="tl-turn-badge">▶ {tl.turnBadge}</span>}
            <span className="tl-seat-name">{p.name}</span>
            <span className="tl-seat-cards" aria-label={tl.cards(p.hand.length)}>
              {p.hand.length > 0 && (
                <span className="tl-mini-fan" aria-hidden="true">
                  {p.hand.slice(0, Math.min(p.hand.length, 5)).map((_, k) => (
                    <CardBack key={k} style={{ '--k': k } as CSSProperties} />
                  ))}
                </span>
              )}
              <strong>{p.hand.length}</strong>
            </span>
            {p.place !== null ? (
              <span className="badge tl-place">{placeName(tl, p.place, state.players.length)}</span>
            ) : connected && !connected[i] ? (
              <span className="badge badge-away">{t.offline}</span>
            ) : (
              p.passed && <span className="badge">{tl.passed}</span>
            )}
          </li>
        ))}
      </ul>

      <section className={`tl-table${state.table && lastPlay?.type === 'played' && lastPlay.chop ? ' chop' : ''}`} aria-label={tl.table}>
        {state.table ? (
          <>
            <div className="tl-play" key={JSON.stringify(state.table.combo.cards)}>
              {state.table.combo.cards.map((c) => (
                <PlayingCard key={c} card={c} />
              ))}
            </div>
            <p className="tl-play-by">
              <TokenIcon token={state.players[state.table.by].token} color={colorHex(state.players[state.table.by].color)} size={22} />
              {state.players[state.table.by].name} · {tl.kinds[state.table.combo.kind]}
            </p>
          </>
        ) : (
          state.phase !== 'playing' && <p className="tl-empty">{tl.gameOver}</p>
        )}
        {state.phase === 'playing' && (
          <p className={`tl-turn${myTurn ? ' mine' : ''}`} style={{ '--player': colorHex(turnOf.color) } as CSSProperties}>
            <TokenIcon token={turnOf.token} color={colorHex(turnOf.color)} size={26} />
            {myTurn ? tl.yourTurn : tl.turnOf(turnOf.name)}
          </p>
        )}
      </section>

      <ul className="tl-log" aria-live="polite">
        {recent.map((e, k) => (
          <li key={`${state.log.length - k}-${e.type}`}>{logLine(tl, e, state)}</li>
        ))}
      </ul>

      {mine && (
        <section className={`tl-me${myTurn ? ' current' : ''}`} style={{ '--player': colorHex(mine.color) } as CSSProperties}>
          <p className={`tl-status${problem ? ' problem' : ''}`} role="status">
            {statusPlayer && <TokenIcon token={statusPlayer.token} color={colorHex(statusPlayer.color)} size={24} />} {status}
          </p>
          <div className="tl-hand" style={{ '--n': Math.max(mine.hand.length, 1) } as CSSProperties}>
            {mine.hand.map((c) => (
              <PlayingCard key={c} card={c} selected={selected.includes(c)} glow={glow.includes(c)} onClick={() => toggle(c)} />
            ))}
          </div>
          {state.phase === 'playing' && mine.place === null && (
            <div className="tl-actions">
              <button type="button" className="secondary" onClick={hint} disabled={!myTurn || hints.length === 0}>
                <Icon name="scroll" /> {tl.hint}
              </button>
              <button type="button" className="secondary" onClick={() => onAct({ type: 'PASS' })} disabled={!myTurn || !canPass(state)}>
                {tl.pass}
              </button>
              <button type="button" className="primary" onClick={play} disabled={!myTurn || !legal}>
                {tl.play} →
              </button>
            </div>
          )}
        </section>
      )}

      {state.phase === 'over' && showGameOver && (
        <GameOver
          state={state}
          tl={tl}
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
  state: TienLenState;
  tl: TienLenText;
  onNext: (() => void) | null;
  waitingFor?: string;
  onLeave: () => void;
  leaveLabel: string;
}

/** After a game: everyone's place and the points so far; deal again (or wait for the host to) or leave. */
function GameOver({ state, tl, onNext, waitingFor, onLeave, leaveLabel }: GameOverProps) {
  const ranked = state.players.map((p, i) => ({ p, i })).sort((a, b) => (a.p.place ?? 99) - (b.p.place ?? 99));
  return (
    <section className="tl-over" role="dialog" aria-label={tl.gameOver}>
      <div className="tl-over-card">
        <h2>
          <Icon name="trophy" /> {tl.gameOver}
        </h2>
        <ol className="tl-ranking">
          {ranked.map(({ p, i }) => (
            <li key={i} style={{ '--player': colorHex(p.color) } as CSSProperties}>
              <span className="tl-rank-place">{placeName(tl, p.place ?? state.players.length, state.players.length)}</span>
              <TokenIcon token={p.token} color={colorHex(p.color)} size={28} />
              <span className="tl-rank-name">{p.name}</span>
              <span className="tl-rank-points">
                {tl.points}: <strong>{state.scores[i]}</strong>
              </span>
            </li>
          ))}
        </ol>
        {!onNext && waitingFor && <p className="muted tl-waiting">{tl.waitingDeal(waitingFor)}</p>}
        <div className="tl-over-actions">
          <button type="button" className="secondary" onClick={onLeave}>
            {leaveLabel}
          </button>
          {onNext && (
            <button type="button" className="primary big" onClick={onNext} autoFocus>
              {tl.nextGame} →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
