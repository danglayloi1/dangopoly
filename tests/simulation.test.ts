import { describe, expect, it } from 'vitest';
import { BOARD_SIZE } from '../src/data/board';
import { applyAction, createGame, legalActions, LOG_LIMIT } from '../src/engine/game';
import { nextUint32 } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';

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
  for (const [space, own] of Object.entries(s.ownership)) {
    if (s.players[own.owner].bankrupt) return `space ${space} is owned by a bankrupt player`;
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

      for (let step = 0; step < 2_000 && s.phase.kind !== 'gameOver'; step++) {
        const actions = legalActions(s);
        if (actions.length === 0) throw new Error(`seed ${seed}: no legal action in ${s.phase.kind}`);
        [choice] = nextUint32(choice);
        s = applyAction(s, { type: actions[choice % actions.length] });
        const error = invariantError(s);
        if (error) throw new Error(`seed ${seed}, step ${step}: ${error}`);
      }
      if (s.phase.kind === 'gameOver') {
        finished++;
        expect(s.players.filter((p) => !p.bankrupt)).toHaveLength(1);
      }
    }
    expect(finished).toBeGreaterThan(0);
  });
});
