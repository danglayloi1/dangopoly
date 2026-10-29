import { describe, expect, it } from 'vitest';
import { BOARD, BOARD_SIZE, GROUP_SPACES } from '../src/data/board';
import { CARDS, CLASSIC_CARD_COUNT } from '../src/data/cards';
import { HOTEL, propertyActions } from '../src/engine/buildings';
import { applyAction, createGame, legalActions, LOG_LIMIT } from '../src/engine/game';
import { ownsWholeGroup } from '../src/engine/rent';
import { nextUint32 } from '../src/engine/rng';
import { canStartTrade, canTradeSpace, tradeProblem } from '../src/engine/trading';
import type { Action, GameState, TradeOffer } from '../src/engine/types';

// Stress test: play many random games and check that the rules never break basic invariants.

const PLAYERS = [
  { name: 'A', token: 'nonLa' },
  { name: 'B', token: 'conTrau' },
  { name: 'C', token: 'quaCam' },
  { name: 'D', token: 'xeDap' },
] as const;

function invariantError(s: GameState): string | null {
  for (const p of s.players) {
    if (p.cash < 0) return `player ${p.id} has negative cash ${p.cash}`;
    if (p.position < 0 || p.position >= BOARD_SIZE) return `player ${p.id} is off the board`;
    if (p.bankrupt && p.cash !== 0) return `bankrupt player ${p.id} still has cash`;
  }
  for (const [key, own] of Object.entries(s.ownership)) {
    const space = Number(key);
    if (s.players[own.owner].bankrupt) return `space ${space} is owned by a bankrupt player`;
    if (own.houses < 0 || own.houses > HOTEL) return `space ${space} has ${own.houses} houses`;
    if (own.houses > 0) {
      const sp = BOARD[space];
      if (sp.kind !== 'property') return `buildings on non-property space ${space}`;
      if (own.mortgaged) return `mortgaged space ${space} has buildings`;
      if (!ownsWholeGroup(s, own.owner, space)) return `buildings on ${space} without the whole set`;
      const group = GROUP_SPACES[sp.group].map((i) => s.ownership[i]);
      if (group.some((o) => o.mortgaged)) return `buildings on ${space} with a mortgaged set member`;
      const houses = group.map((o) => o.houses);
      if (Math.max(...houses) - Math.min(...houses) > 1) return `uneven buildings in the set of ${space}`;
    }
  }
  if (s.phase.kind !== 'gameOver' && s.players[s.current].bankrupt) return 'a bankrupt player has the turn';
  for (const p of s.players) {
    if (p.inJail && p.position !== 10) return `player ${p.id} is in jail but not on the jail space`;
    // 3 only while they owe the forced fine after the third failed roll
    const owesFine = s.phase.kind === 'inDebt' && s.phase.debtor === p.id && s.phase.reason.kind === 'jailFine';
    if (p.jailAttempts < 0 || p.jailAttempts > (owesFine ? 3 : 2)) {
      return `player ${p.id} has ${p.jailAttempts} jail attempts`;
    }
  }
  for (const deck of ['chance', 'community'] as const) {
    const held = s.players.flatMap((p) => p.jailCards).filter((d) => d === deck).length;
    if (new Set(s.decks[deck]).size !== s.decks[deck].length) return `duplicate cards in ${deck}`;
    const size = s.rules.viet?.funnyCards ? CARDS[deck].length : CLASSIC_CARD_COUNT[deck]; // funny cards only with Chế độ Việt
    if (s.decks[deck].length + held !== size) return `${deck} has ${s.decks[deck].length} cards + ${held} held`;
  }
  if (s.log.length > LOG_LIMIT) return 'log grew past its limit';
  return null;
}

/** A random offer from the current player: up to 2 tradable spaces and some cash each way. */
function randomOffer(s: GameState, seed: number): TradeOffer {
  let r = seed;
  const next = (n: number) => {
    [r] = nextUint32(r);
    return r % n;
  };
  const others = s.players.filter((p) => p.id !== s.current && !p.bankrupt);
  const to = others[next(others.length)].id;
  const pick = (owner: number) => {
    const mine = Object.entries(s.ownership)
      .filter(([space, own]) => own.owner === owner && canTradeSpace(s, Number(space)))
      .map(([space]) => Number(space));
    return mine.filter(() => next(3) === 0).slice(0, 2);
  };
  const cash = (owner: number) => (next(2) === 0 ? 0 : Math.min(s.players[owner].cash, next(20) * 100_000));
  return {
    from: s.current,
    to,
    give: { spaces: pick(s.current), cash: cash(s.current), jailCards: next(3) === 0 ? s.players[s.current].jailCards.length : 0 },
    take: { spaces: pick(to), cash: cash(to), jailCards: next(3) === 0 ? s.players[to].jailCards.length : 0 },
  };
}

describe('random games', () => {
  it('keep every invariant for 200 games', () => {
    let finished = 0;
    let trades = 0;
    let limited = 0;
    for (let seed = 1; seed <= 200; seed++) {
      // Every game type: classic, a round limit, or a time limit; festivals in half the games.
      const mode =
        seed % 3 === 0 ? { kind: 'rounds' as const, rounds: 12 } : seed % 3 === 1 ? { kind: 'classic' as const } : { kind: 'time' as const, minutes: 30 };
      let s = createGame({
        players: PLAYERS.slice(0, 2 + (seed % 3)).map((p) => ({ ...p })),
        seed,
        startingCash: 3_000_000, // low cash so bankruptcies actually happen
        // Chế độ Việt (every rule) in every fourth game, so haggling, tantrums, Tết and the funny cards get played too.
        rules: { mode, festivals: seed % 2 === 0, ...(seed % 4 === 0 ? { viet: { tet: true, anVa: true, macCa: true, funnyCards: true, missions: true } } : {}) },
      });
      let choice = seed * 7919;

      for (let step = 0; step < 3_000 && s.phase.kind !== 'gameOver'; step++) {
        const turn = legalActions(s);
        const property = propertyActions(s);
        if (turn.length === 0) throw new Error(`seed ${seed}: no legal action in ${s.phase.kind}`);
        [choice] = nextUint32(choice);
        // Mostly play the turn; sometimes build, sell or mortgage; now and then offer a trade.
        let action: Action =
          property.length > 0 && choice % 10 < 3
            ? property[(choice >>> 4) % property.length]
            : { type: turn[(choice >>> 4) % turn.length] };
        if (canStartTrade(s) && choice % 20 === 7) {
          const offer = randomOffer(s, choice);
          if (tradeProblem(s, offer) === null) action = { type: 'PROPOSE_TRADE', offer };
        }
        // Timed games: say the time is up after a while, at the start of a turn.
        if (mode.kind === 'time' && step > 600 && s.phase.kind === 'awaitRoll') action = { type: 'TIME_UP' };
        s = applyAction(s, action);
        if (action.type === 'ACCEPT_TRADE') trades++;
        const error = invariantError(s);
        if (error) throw new Error(`seed ${seed}, step ${step}, ${action.type}: ${error}`);
      }
      if (s.phase.kind === 'gameOver') {
        finished++;
        if (s.endReason === 'lastStanding') expect(s.players.filter((p) => !p.bankrupt)).toHaveLength(1);
        else limited++;
        expect(s.worth.length).toBeGreaterThan(0);
      }
    }
    expect(finished).toBeGreaterThan(50);
    expect(trades).toBeGreaterThan(100); // trades really happen in these games
    expect(limited).toBeGreaterThan(20); // and round or time limits end games
  }, 60_000); // some seconds of random play (more on a busy machine)
});
