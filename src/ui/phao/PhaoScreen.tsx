import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { phaoBotAction } from '../../games/phao/bot';
import { isFood, kindOf, type Card } from '../../games/phao/cards';
import { applyPhao, canPlay, firecrackersLeft, foodPairs, targets, type PhaoAction, type PhaoLog, type PhaoState } from '../../games/phao/game';
import { PHAO_TEXT, type PhaoText } from '../../games/phao/text';
import { useLang } from '../../i18n/LangContext';
import { speedFactor } from '../animation';
import { ScreenTop } from '../Header';
import { Icon } from '../icons';
import { colorHex } from '../look';
import { playSound } from '../sound';
import '../tienlen/tienlen.css';
import '../eights/eights.css';
import { TokenIcon } from '../TokenIcon';
import { PhaoArt, PhaoCard, PhaoCardBack } from './PhaoCard';
import './phao.css';

const THINK_MS = 1000;
const BURST_MS = 1400;

export function logLine(ph: PhaoText, e: PhaoLog, state: PhaoState): string {
  const name = (i: number) => state.players[i].name;
  const cardName = (c: Card) => ph.cards[kindOf(c)].name;
  switch (e.type) {
    case 'dealt':
      return ph.dealt(e.game);
    case 'played':
      return e.target === undefined ? ph.played(name(e.player), cardName(e.card)) : ph.playedOn(name(e.player), cardName(e.card), name(e.target));
    case 'pair':
      return ph.pair(name(e.player), cardName(e.cards[0]), name(e.target));
    case 'took':
      return ph.took(name(e.player), name(e.from));
    case 'drew':
      return e.bottom ? ph.drewBottom(name(e.player)) : ph.drew(name(e.player));
    case 'putOut':
      return ph.putOut(name(e.player));
    case 'hid':
      return ph.hid(name(e.player));
    case 'exploded':
      return ph.exploded(name(e.player));
    case 'shuffled':
      return ph.shuffled(name(e.player));
    case 'turns':
      return ph.turns(name(e.player), e.turns);
    case 'won':
      return ph.won(name(e.player));
  }
}

/** The entries added since the last one seen (found by value: online every update is a fresh copy). */
function freshEntries(lastSeen: string | null, log: readonly PhaoLog[]): PhaoLog[] {
  if (lastSeen === null) return [];
  for (let i = log.length - 1; i >= 0; i--) if (JSON.stringify(log[i]) === lastSeen) return log.slice(i + 1);
  return [];
}

/** A game of Pháo Tết against the computer, on this device: you are the first player. */
export function PhaoScreen({ initial, onLeave }: { initial: PhaoState; onLeave: () => void }) {
  const { uiLang } = useLang();
  const [state, setState] = useState(initial);
  const act = (action: PhaoAction) => setState((s) => applyPhao(s, action));

  // Computer players move after a pause, longer after a bang, so you can follow what they do.
  useEffect(() => {
    const action = phaoBotAction(state);
    if (!action) return;
    const bang = state.log.at(-1)?.type === 'exploded' || state.log.at(-1)?.type === 'putOut';
    const timer = setTimeout(() => act(action), (THINK_MS + (bang ? BURST_MS : 0)) * Math.max(speedFactor(), 0.3));
    return () => clearTimeout(timer);
  }, [state]);

  // Dev only: lets the screenshot script see and drive the game.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __phao?: unknown }).__phao = { get: () => state, act, set: setState };
  }, [state]);

  return <PhaoTable state={state} me={0} onAct={act} onLeave={onLeave} leaveLabel={PHAO_TEXT[uiLang].toMenu} canDeal />;
}

interface TableProps {
  state: PhaoState;
  me: number | null; // this device's player; null when only watching
  onAct: (action: PhaoAction) => void;
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

/** The table: the others along the top, the deck and the played cards in the middle, your hand at the bottom. */
export function PhaoTable({
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
  const ph = PHAO_TEXT[uiLang];
  const [selected, setSelected] = useState<Card | null>(null);
  const [burst, setBurst] = useState<{ kind: 'boom' | 'splash'; player: number; key: number } | null>(null);
  const lastSeen = useRef<string | null>(JSON.stringify(state.log.at(-1) ?? null));

  // Sounds, and a bang (or a splash) for a firecracker drawn.
  useEffect(() => {
    const fresh = freshEntries(lastSeen.current, state.log);
    lastSeen.current = JSON.stringify(state.log.at(-1) ?? null);
    const boom = fresh.find((e) => e.type === 'exploded');
    const splash = fresh.find((e) => e.type === 'putOut');
    if (boom?.type === 'exploded') {
      playSound('bankrupt');
      setBurst({ kind: 'boom', player: boom.player, key: state.log.length });
    } else if (splash?.type === 'putOut') {
      playSound('whoosh');
      setBurst({ kind: 'splash', player: splash.player, key: state.log.length });
    }
    if (fresh.some((e) => e.type === 'won')) playSound('win');
    else if (!boom && !splash && fresh.some((e) => e.type === 'played' || e.type === 'pair' || e.type === 'drew' || e.type === 'dealt')) playSound('card');
  }, [state.log]);

  useEffect(() => {
    if (!burst) return;
    const timer = setTimeout(() => setBurst(null), BURST_MS * Math.max(speedFactor(), 0.3));
    return () => clearTimeout(timer);
  }, [burst]);

  useEffect(() => setSelected(null), [state.current, state.game, state.phase.kind]);

  const mine = me === null ? null : state.players[me];
  const myTurn = me !== null && state.phase.kind === 'turn' && state.current === me;
  const hiding = me !== null && state.phase.kind === 'hide' && state.current === me;
  const turnOf = state.players[state.current];
  const topDiscard = state.discard.at(-1);
  const peek = me !== null && state.peek?.player === me ? state.peek.cards : null;
  const pairs = myTurn ? foodPairs(state) : [];
  const pairFor = (c: Card) => pairs.find((p) => p.includes(c)) ?? null;

  const selectedKind = selected === null ? null : kindOf(selected);
  const selectedPair = selected !== null && isFood(selected) ? pairFor(selected) : null;
  const needsTarget = selectedKind === 'xin' || selectedPair !== null;
  const selectedPlayable = selected !== null && myTurn && (canPlay(state, selected) || selectedPair !== null);

  const playSelected = (target?: number) => {
    if (selected === null) return;
    if (selectedPair) onAct({ type: 'PAIR', cards: selectedPair, target: target! });
    else onAct(target === undefined ? { type: 'PLAY', card: selected } : { type: 'PLAY', card: selected, target });
    setSelected(null);
  };

  const status =
    state.phase.kind === 'over'
      ? ph.gameOver
      : hiding
        ? ph.hideTitle
        : state.phase.kind === 'hide'
          ? ph.hiding(turnOf.name)
          : !myTurn
            ? ph.thinking(turnOf.name)
            : state.turns > 1
              ? ph.hintTurns(state.turns)
              : ph.hint;
  const statusPlayer = myTurn || hiding || state.phase.kind === 'over' ? mine : turnOf;

  const others = state.players.map((p, i) => ({ p, i }));
  const seats = me === null ? others : [...others.slice(me + 1), ...others.slice(0, me)];
  const recent = state.log.slice(-4).reverse();
  const deckSize = state.deck.length;

  return (
    <main className="tl-screen e8-screen ph-screen">
      <ScreenTop title={title ?? `${ph.name} · ${ph.game(state.game)}`} onBack={onLeave} />
      {top}

      <ul className="tl-opponents">
        {seats.map(({ p, i }) => (
          <li
            key={i}
            className={`tl-seat${state.current === i && state.phase.kind !== 'over' ? ' current' : ''}${p.out ? ' ph-out' : ''}${connected && !connected[i] ? ' away' : ''}${burst?.player === i ? ` ph-hit-${burst.kind}` : ''}`}
            style={{ '--player': colorHex(p.color) } as CSSProperties}
          >
            <TokenIcon token={p.token} color={colorHex(p.color)} size={34} />
            {state.current === i && state.phase.kind !== 'over' && (
              <span className="tl-turn-badge">
                ▶ {ph.turnBadge}
                {state.turns > 1 ? ` ×${state.turns}` : ''}
              </span>
            )}
            <span className="tl-seat-name">{p.name}</span>
            {p.out ? (
              <span className="badge ph-out-badge">💥 {ph.outBadge}</span>
            ) : (
              <span className="tl-seat-cards" aria-label={ph.handCount(p.hand.length)}>
                {p.hand.length > 0 && (
                  <span className="tl-mini-fan" aria-hidden="true">
                    {p.hand.slice(0, Math.min(p.hand.length, 5)).map((_, k) => (
                      <PhaoCardBack key={k} style={{ '--k': k } as CSSProperties} />
                    ))}
                  </span>
                )}
                <strong>{p.hand.length}</strong>
              </span>
            )}
            {connected && !connected[i] && <span className="badge badge-away">{t.offline}</span>}
          </li>
        ))}
      </ul>

      <section className="tl-table e8-table ph-table" aria-label={ph.table}>
        <div className="e8-center">
          <button
            type="button"
            className="e8-deck ph-deck"
            onClick={() => onAct({ type: 'DRAW' })}
            disabled={!myTurn}
            aria-label={`${ph.draw} · ${ph.deck(deckSize)}`}
            title={ph.draw}
          >
            <PhaoCardBack />
            <span className="e8-count">{deckSize}</span>
          </button>
          <div className="e8-pile ph-discard" key={state.discard.length + state.game * 100}>
            {topDiscard !== undefined ? <PhaoCard card={topDiscard} /> : <span className="pcard e8-empty" aria-hidden="true" />}
          </div>
          <div className="e8-info">
            {state.phase.kind !== 'over' && (
              <span className="badge ph-danger">
                <PhaoArt kind="phao" size={18} /> {ph.danger(firecrackersLeft(state), deckSize)}
              </span>
            )}
          </div>
        </div>
        {state.phase.kind !== 'over' ? (
          <p className={`tl-turn${myTurn || hiding ? ' mine' : ''}`} style={{ '--player': colorHex(turnOf.color) } as CSSProperties}>
            <TokenIcon token={turnOf.token} color={colorHex(turnOf.color)} size={26} />
            {myTurn || hiding ? ph.yourTurn : ph.turnOf(turnOf.name)}
          </p>
        ) : (
          <p className="tl-empty">{ph.gameOver}</p>
        )}
        {burst && (
          <div key={burst.key} className={`ph-burst ${burst.kind}`} aria-hidden="true">
            {burst.kind === 'boom' ? (
              <>
                <span className="ph-burst-rays" />
                <strong>{ph.boom}</strong>
              </>
            ) : (
              <PhaoArt kind="xo" size={84} />
            )}
          </div>
        )}
      </section>

      {peek && (
        <section className="ph-peek" aria-label={ph.peekTitle}>
          <p>{ph.peekTitle}</p>
          <div>
            {peek.map((c, k) => (
              <PhaoCard key={`${c}-${k}`} card={c} />
            ))}
          </div>
        </section>
      )}

      <ul className="tl-log" aria-live="polite">
        {recent.map((e, k) => (
          <li key={`${state.log.length - k}-${e.type}`}>{logLine(ph, e, state)}</li>
        ))}
      </ul>

      {mine && (
        <section
          className={`tl-me${myTurn || hiding ? ' current' : ''}${mine.out ? ' ph-out' : ''}`}
          style={{ '--player': colorHex(mine.color) } as CSSProperties}
        >
          <p className="tl-status" role="status">
            {statusPlayer && <TokenIcon token={statusPlayer.token} color={colorHex(statusPlayer.color)} size={24} />} {mine.out ? `💥 ${ph.outBadge}` : status}
          </p>
          {hiding ? (
            <div className="ph-hide" role="group" aria-label={ph.hideTitle}>
              <p className="muted">{ph.hideHint}</p>
              <div className="ph-hide-choices">
                <button type="button" className="primary" onClick={() => onAct({ type: 'HIDE', position: 0 })}>
                  {ph.hideTop}
                </button>
                {deckSize >= 1 && (
                  <button type="button" className="secondary" onClick={() => onAct({ type: 'HIDE', position: 1 })}>
                    {ph.hideAt(2)}
                  </button>
                )}
                {deckSize >= 2 && (
                  <button type="button" className="secondary" onClick={() => onAct({ type: 'HIDE', position: 2 })}>
                    {ph.hideAt(3)}
                  </button>
                )}
                {deckSize >= 3 && (
                  <button type="button" className="secondary" onClick={() => onAct({ type: 'HIDE', position: deckSize })}>
                    {ph.hideBottom}
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => onAct({ type: 'HIDE', position: crypto.getRandomValues(new Uint32Array(1))[0] % (deckSize + 1) })}
                >
                  🎲 {ph.hideRandom}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="tl-hand" style={{ '--n': Math.max(mine.hand.length, 1) } as CSSProperties}>
                {mine.hand.map((c) => (
                  <PhaoCard
                    key={c}
                    card={c}
                    selected={c === selected || (selectedPair?.includes(c) ?? false)}
                    glow={glow.includes(c)}
                    onClick={() => setSelected(c === selected ? null : c)}
                  />
                ))}
              </div>
              {selected !== null && selectedKind && (
                <div className="ph-info">
                  <PhaoArt kind={selectedKind} size={36} />
                  <p>
                    <strong>{ph.cards[selectedKind].name}</strong>
                    <span>{ph.cards[selectedKind].does}</span>
                  </p>
                </div>
              )}
              {selected === null && !mine.out && state.phase.kind === 'turn' && <p className="muted ph-tip">{ph.pickCard}</p>}
            </>
          )}
          {state.phase.kind === 'turn' && !mine.out && (
            <div className="tl-actions ph-actions">
              {selectedPlayable && needsTarget ? (
                <div className="ph-targets" role="group" aria-label={ph.takeFrom}>
                  <span>
                    {selectedPair ? `${ph.playPair} · ` : ''}
                    {ph.takeFrom}
                  </span>
                  {targets(state).map((i) => {
                    const p = state.players[i];
                    return (
                      <button key={i} type="button" className="secondary ph-target" onClick={() => playSelected(i)}>
                        <TokenIcon token={p.token} color={colorHex(p.color)} size={22} /> {p.name} ({p.hand.length})
                      </button>
                    );
                  })}
                </div>
              ) : selectedPlayable ? (
                <button type="button" className="secondary" onClick={() => playSelected()}>
                  {ph.play} {ph.cards[selectedKind!].name}
                </button>
              ) : null}
              {selected !== null && (
                <button type="button" className="secondary" onClick={() => setSelected(null)}>
                  {ph.cancel}
                </button>
              )}
              <button type="button" className="primary" onClick={() => onAct({ type: 'DRAW' })} disabled={!myTurn}>
                {myTurn && state.turns > 1 ? ph.drawTurns(state.turns) : ph.draw}
              </button>
            </div>
          )}
        </section>
      )}

      {state.phase.kind === 'over' && showGameOver && (
        <GameOver
          state={state}
          ph={ph}
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
  state: PhaoState;
  ph: PhaoText;
  onNext: (() => void) | null;
  waitingFor?: string;
  onLeave: () => void;
  leaveLabel: string;
}

/** After a game: who was left standing, and everyone's wins so far; deal again (or wait for the host to) or leave. */
function GameOver({ state, ph, onNext, waitingFor, onLeave, leaveLabel }: GameOverProps) {
  const winner = state.phase.kind === 'over' ? state.phase.winner : -1;
  const ranked = state.players.map((p, i) => ({ p, i })).sort((a, b) => state.scores[b.i] - state.scores[a.i]);
  return (
    <section className="tl-over" role="dialog" aria-label={ph.gameOver}>
      <div className="tl-over-card">
        <h2>
          <Icon name="trophy" /> {ph.gameOver}
        </h2>
        {winner >= 0 && <p className="e8-winner ph-winner">{ph.winner(state.players[winner].name)}</p>}
        <ol className="tl-ranking">
          {ranked.map(({ p, i }) => (
            <li key={i} style={{ '--player': colorHex(p.color) } as CSSProperties}>
              <span className="tl-rank-place">{i === winner ? '★' : p.out ? '💥' : ''}</span>
              <TokenIcon token={p.token} color={colorHex(p.color)} size={28} />
              <span className="tl-rank-name">{p.name}</span>
              <span className="tl-rank-points">
                {ph.wins}: <strong>{state.scores[i]}</strong>
              </span>
            </li>
          ))}
        </ol>
        {!onNext && waitingFor && <p className="muted tl-waiting">{ph.waitingDeal(waitingFor)}</p>}
        <div className="tl-over-actions">
          <button type="button" className="secondary" onClick={onLeave}>
            {leaveLabel}
          </button>
          {onNext && (
            <button type="button" className="primary big" onClick={onNext} autoFocus>
              {ph.nextGame} →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
