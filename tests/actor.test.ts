import { describe, expect, it } from 'vitest';
import { actorFor, applyAction, createGame } from '../src/engine/game';
import type { Action, GameState } from '../src/engine/types';

// Who may send each move when every player is on their own device.

function newGame(): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
      { name: 'Minh', token: 'xeDap' },
    ],
    seed: 7,
  });
}

const ROLL: Action = { type: 'ROLL' };

describe('who may move', () => {
  it('is the current player during a normal turn', () => {
    const s = newGame();
    expect(actorFor(s, ROLL)).toBe(0);
    const later = structuredClone(s);
    later.current = 2;
    expect(actorFor(later, ROLL)).toBe(2);
    expect(actorFor(later, { type: 'BUILD_HOUSE', space: 1 })).toBe(2);
  });

  it('is the player in debt while a debt is open, even on someone else’s turn', () => {
    const s = newGame();
    s.phase = { kind: 'inDebt', debtor: 1, creditor: 0, amount: 5_000_000, reason: { kind: 'rent', space: 3 } };
    expect(actorFor(s, { type: 'PAY_DEBT' })).toBe(1);
    expect(actorFor(s, { type: 'MORTGAGE', space: 6 })).toBe(1);
  });

  it('is the player a trade is offered to, and only for the answer', () => {
    const s = newGame();
    s.ownership[1] = { owner: 0, houses: 0, mortgaged: false };
    const offer = { from: 0, to: 2, give: { spaces: [1], cash: 0, jailCards: 0 }, take: { spaces: [], cash: 1_000_000, jailCards: 0 } };
    const waiting = applyAction(s, { type: 'PROPOSE_TRADE', offer });
    expect(actorFor(waiting, { type: 'ACCEPT_TRADE' })).toBe(2);
    expect(actorFor(waiting, { type: 'REJECT_TRADE' })).toBe(2);
    expect(actorFor(waiting, ROLL)).toBeNull();
  });

  it('is nobody once the game is over', () => {
    const s = newGame();
    s.phase = { kind: 'gameOver', winner: 0 };
    expect(actorFor(s, ROLL)).toBeNull();
  });
});
