import { describe, expect, it } from 'vitest';
import { BOARD, BOARD_SIZE, GROUP_SPACES } from '../src/data/board';
import { HOTEL, propertyActions } from '../src/engine/buildings';
import { applyAction, createGame, legalActions, LOG_LIMIT } from '../src/engine/game';
import { ownsWholeGroup } from '../src/engine/rent';
import { nextUint32 } from '../src/engine/rng';
import type { Action, GameState } from '../src/engine/types';

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
  if (s.log.length > LOG_LIMIT) return 'log grew past its limit';
  return null;
}

describe('random games', () => {
  it('keep every invariant for 200 games', () => {
    let finished = 0;
    for (let seed = 1; seed <= 200; seed++) {
      let s = createGame({
        players: PLAYERS.slice(0, 2 + (seed % 3)).map((p) => ({ ...p })),
        seed,
        startingCash: 3_000_000, // low cash so bankruptcies actually happen
      });
      let choice = seed * 7919;

      for (let step = 0; step < 3_000 && s.phase.kind !== 'gameOver'; step++) {
        const turn = legalActions(s);
        const property = propertyActions(s);
        if (turn.length === 0) throw new Error(`seed ${seed}: no legal action in ${s.phase.kind}`);
        [choice] = nextUint32(choice);
        // Mostly play the turn; sometimes build, sell or mortgage.
        const action: Action =
          property.length > 0 && choice % 10 < 3
            ? property[(choice >>> 4) % property.length]
            : { type: turn[(choice >>> 4) % turn.length] };
        s = applyAction(s, action);
        const error = invariantError(s);
        if (error) throw new Error(`seed ${seed}, step ${step}, ${action.type}: ${error}`);
      }
      if (s.phase.kind === 'gameOver') {
        finished++;
        expect(s.players.filter((p) => !p.bankrupt)).toHaveLength(1);
      }
    }
    expect(finished).toBeGreaterThan(50);
  }, 30_000); // a few seconds of random play
});
