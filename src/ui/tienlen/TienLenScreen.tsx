import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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

const ME = 0; // on one device, you are always the first player
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

/** A game of Tiến lên against the computer: the others around the table, the play to beat, your hand. */
export function TienLenScreen({ initial, onLeave }: { initial: TienLenState; onLeave: () => void }) {
  const { uiLang } = useLang();
  const tl = TIENLEN_TEXT[uiLang];
  const [state, setState] = useState(initial);
  const [selected, setSelected] = useState<Card[]>([]);
  const [hintIndex, setHintIndex] = useState(0);
  const seenLog = useRef(state.log.length);

  const act = (action: TienLenAction) => setState((s) => applyTienLen(s, action));

  // Computer players move after a short pause, so you can follow what they do.
  useEffect(() => {
    const action = tienLenBotAction(state);
    if (!action) return;
    const timer = setTimeout(() => act(action), THINK_MS * Math.max(speedFactor(), 0.3));
    return () => clearTimeout(timer);
  }, [state]);

  // Sounds for what just happened.
  useEffect(() => {
    const fresh = state.log.slice(Math.min(seenLog.current, state.log.length));
    seenLog.current = state.log.length;
    if (fresh.some((e) => e.type === 'gameOver' || e.type === 'instantWin')) playSound('win');
    else if (fresh.some((e) => e.type === 'played' && e.chop)) playSound('thud');
    else if (fresh.some((e) => e.type === 'played' || e.type === 'dealt')) playSound('card');
  }, [state.log]);

  // A new game, or the hand changed under the selection: start the selection over.
  useEffect(() => {
    setSelected((sel) => sel.filter((c) => state.players[ME].hand.includes(c)));
    setHintIndex(0);
  }, [state.players[ME].hand.length, state.game]);

  // Dev only: lets the screenshot script see and drive the game.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __tienlen?: unknown }).__tienlen = {
      get: () => state,
      act,
    };
  }, [state]);

  const me = state.players[ME];
  const myTurn = state.phase === 'playing' && state.current === ME;
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
    act({ type: 'PLAY', cards: selected });
    setSelected([]);
  };

  // What to tell you now.
  const problem =
    myTurn && selected.length > 0 && !legal
      ? !chosen
        ? tl.notCombo
        : state.mustInclude !== null && !selected.includes(state.mustInclude)
          ? tl.mustHave(cardName(state.mustInclude))
          : tl.tooLow
      : null;
  const status =
    state.phase === 'over'
      ? tl.gameOver
      : me.place !== null
        ? tl.youAreOut(placeName(tl, me.place, state.players.length))
        : myTurn
          ? (problem ?? (state.mustInclude !== null ? tl.mustInclude(cardName(state.mustInclude)) : state.table ? tl.beat : tl.lead))
          : tl.thinking(state.players[state.current].name);

  // The others, in playing order after you.
  const others = state.players.map((p, i) => ({ p, i })).filter(({ i }) => i !== ME);
  const recent = state.log.slice(-4).reverse();

  return (
    <main className="tl-screen">
      <ScreenTop title={`${tl.name} · ${tl.game(state.game)}`} onBack={onLeave} />

      <ul className="tl-opponents">
        {others.map(({ p, i }) => (
          <li
            key={i}
            className={`tl-seat${state.current === i && state.phase === 'playing' ? ' current' : ''}`}
            style={{ '--player': colorHex(p.color) } as CSSProperties}
          >
            <TokenIcon token={p.token} color={colorHex(p.color)} size={34} />
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
            ) : (
              p.passed && <span className="badge">{tl.passed}</span>
            )}
          </li>
        ))}
      </ul>

      <section
        className={`tl-table${state.table?.combo && state.log.at(-1)?.type === 'played' && (state.log.at(-1) as { chop: boolean }).chop ? ' chop' : ''}`}
        aria-label={tl.table}
      >
        {state.table ? (
          <>
            <div className="tl-play" key={state.log.length}>
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
          <p className="tl-empty">{state.phase === 'playing' ? (myTurn ? tl.yourTurn : tl.turnOf(state.players[state.current].name)) : tl.gameOver}</p>
        )}
      </section>

      <ul className="tl-log" aria-live="polite">
        {recent.map((e, k) => (
          <li key={state.log.length - k}>{logLine(tl, e, state)}</li>
        ))}
      </ul>

      <section className={`tl-me${myTurn ? ' current' : ''}`} style={{ '--player': colorHex(me.color) } as CSSProperties}>
        <p className={`tl-status${problem ? ' problem' : ''}`} role="status">
          <TokenIcon token={me.token} color={colorHex(me.color)} size={24} /> {status}
        </p>
        <div className="tl-hand" style={{ '--n': Math.max(me.hand.length, 1) } as CSSProperties}>
          {me.hand.map((c) => (
            <PlayingCard key={c} card={c} selected={selected.includes(c)} onClick={() => toggle(c)} />
          ))}
        </div>
        {state.phase === 'playing' && me.place === null && (
          <div className="tl-actions">
            <button type="button" className="secondary" onClick={hint} disabled={!myTurn || hints.length === 0}>
              <Icon name="scroll" /> {tl.hint}
            </button>
            <button type="button" className="secondary" onClick={() => act({ type: 'PASS' })} disabled={!myTurn || !canPass(state)}>
              {tl.pass}
            </button>
            <button type="button" className="primary" onClick={play} disabled={!myTurn || !legal}>
              {tl.play} →
            </button>
          </div>
        )}
      </section>

      {state.phase === 'over' && <GameOver state={state} tl={tl} onNext={() => act({ type: 'NEXT_GAME' })} onLeave={onLeave} />}
    </main>
  );
}

/** After a game: everyone's place and the points so far; deal again or leave. */
function GameOver({ state, tl, onNext, onLeave }: { state: TienLenState; tl: TienLenText; onNext: () => void; onLeave: () => void }) {
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
        <div className="tl-over-actions">
          <button type="button" className="secondary" onClick={onLeave}>
            {tl.toHub}
          </button>
          <button type="button" className="primary big" onClick={onNext} autoFocus>
            {tl.nextGame} →
          </button>
        </div>
      </div>
    </section>
  );
}
