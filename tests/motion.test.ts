import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { applyAction, createGame } from '../src/engine/game';
import type { GameState, LogEntry } from '../src/engine/types';
import { effectsFor, hasMotion, newLogEntries, planMoves, soundFor, stepPath } from '../src/ui/motion';

function newGame(): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
    ],
    seed: 5,
  });
}

describe('newLogEntries', () => {
  it('finds what an action added', () => {
    const before = newGame();
    const after = applyAction(before, { type: 'ROLL', dice: [1, 2] });
    expect(newLogEntries(before.log, after.log).map((e) => e.type)).toEqual(['rolled', 'moved']);
  });

  it('is empty when nothing changed or the history is unknown', () => {
    const game = newGame();
    expect(newLogEntries(game.log, game.log)).toEqual([]);
    expect(newLogEntries(game.log, structuredClone(game.log))).toEqual([]);
    const other = applyAction(newGame(), { type: 'ROLL', dice: [2, 3] });
    const elsewhere = applyAction(applyAction(other, { type: 'DECLINE' }), { type: 'END_TURN' });
    expect(newLogEntries(elsewhere.log, applyAction(game, { type: 'ROLL', dice: [1, 2] }).log)).toEqual([]);
  });

  it('finds what an action added when the game arrives as a copy (online)', () => {
    const before = newGame();
    const after = structuredClone(applyAction(before, { type: 'ROLL', dice: [1, 2] }));
    expect(newLogEntries(structuredClone(before.log), after.log).map((e) => e.type)).toEqual(['rolled', 'moved']);
  });

  it('still works once the log is trimmed to its limit', () => {
    let game = newGame();
    for (let i = 0; i < 150; i++) {
      game = applyAction(game, { type: 'ROLL', dice: [1, 2] });
      game = applyAction(game, game.phase.kind === 'awaitBuy' ? { type: 'DECLINE' } : { type: 'END_TURN' });
      if (game.phase.kind === 'awaitEndTurn') game = applyAction(game, { type: 'END_TURN' });
      if (game.phase.kind !== 'awaitRoll') break;
    }
    const next = applyAction(game, { type: 'ROLL', dice: [1, 2] });
    expect(newLogEntries(game.log, next.log)[0].type).toBe('rolled');
    expect(newLogEntries(structuredClone(game.log), structuredClone(next.log))[0].type).toBe('rolled');
  });
});

describe('stepPath', () => {
  it('steps forward, around the corner', () => {
    expect(stepPath(37, 2, false)).toEqual([38, 39, 0, 1, 2]);
  });

  it('steps backward', () => {
    expect(stepPath(7, 4, true)).toEqual([6, 5, 4]);
  });

  it('is empty when already there', () => {
    expect(stepPath(5, 5, false)).toEqual([]);
  });
});

describe('planMoves', () => {
  it('hops the dice total', () => {
    const entries: LogEntry[] = [
      { type: 'rolled', player: 0, dice: [1, 2] },
      { type: 'moved', player: 0, to: 3 },
    ];
    expect(planMoves(entries, [0, 0])).toEqual([{ player: 0, path: [1, 2, 3], jump: false }]);
  });

  it('follows a card that moves the token again', () => {
    const entries: LogEntry[] = [
      { type: 'moved', player: 0, to: 7 },
      { type: 'drewCard', player: 0, deck: 'chance', card: 0 },
      { type: 'moved', player: 0, to: 9 },
    ];
    const moves = planMoves(entries, [5, 0]);
    expect(moves.map((m) => m.path)).toEqual([[6, 7], [8, 9]]);
  });

  it('goes backwards for "go back 3 spaces"', () => {
    const back = CARDS.chance.findIndex((c) => c.effect.kind === 'moveBack');
    const entries: LogEntry[] = [
      { type: 'moved', player: 0, to: 7 },
      { type: 'drewCard', player: 0, deck: 'chance', card: back },
      { type: 'moved', player: 0, to: 4 },
    ];
    expect(planMoves(entries, [6, 0]).map((m) => m.path)).toEqual([[7], [6, 5, 4]]);
  });

  it('goes all the way round for a card that advances to a space just behind', () => {
    const entries: LogEntry[] = [
      { type: 'drewCard', player: 0, deck: 'chance', card: 3 }, // not a move-back card
      { type: 'moved', player: 0, to: 21 },
    ];
    expect(planMoves(entries, [22, 0])[0].path).toHaveLength(39);
  });

  it('jumps straight to jail', () => {
    const entries: LogEntry[] = [
      { type: 'moved', player: 1, to: 30 },
      { type: 'wentToJail', player: 1, reason: 'space' },
    ];
    expect(planMoves(entries, [0, 28])).toEqual([
      { player: 1, path: [29, 30], jump: false },
      { player: 1, path: [10], jump: true },
    ]);
  });
});

describe('hasMotion and soundFor', () => {
  it('knows which entries need animating', () => {
    expect(hasMotion([{ type: 'bought', player: 0, space: 3, price: 600_000 }])).toBe(false);
    expect(hasMotion([{ type: 'rolled', player: 0, dice: [1, 1] }])).toBe(true);
  });

  it('picks a sound for the main events only', () => {
    expect(soundFor({ type: 'bought', player: 0, space: 3, price: 600_000 })).toBe('buy');
    expect(soundFor({ type: 'wentToJail', player: 0, reason: 'card' })).toBe('jail');
    expect(soundFor({ type: 'won', player: 0 })).toBe('win');
    expect(soundFor({ type: 'turnStarted', player: 1 })).toBeNull();
  });
});

describe('effects after a move', () => {
  const game = createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
      { name: 'Minh', token: 'xeDap' },
    ],
    seed: 1,
  });
  game.players[0].position = 6;
  game.players[1].position = 10;
  game.players[2].position = 21;

  it('stamps a seal on what was bought', () => {
    expect(effectsFor([{ type: 'bought', player: 0, space: 6, price: 1_000_000 }], game)).toEqual([{ kind: 'seal', space: 6 }]);
  });

  it('sends coins from payer to owner, and to or from the bank', () => {
    expect(effectsFor([{ type: 'paidRent', player: 0, to: 1, space: 6, amount: 60_000 }], game)).toEqual([
      { kind: 'money', from: 6, to: 10, amount: 60_000 },
    ]);
    expect(effectsFor([{ type: 'paidTax', player: 0, space: 4, amount: 2_000_000 }], game)).toEqual([
      { kind: 'money', from: 6, to: 'bank', amount: 2_000_000 },
    ]);
    expect(effectsFor([{ type: 'passedStart', player: 0, amount: 2_000_000 }], game)).toEqual([
      { kind: 'money', from: 0, to: 6, amount: 2_000_000 },
    ]);
  });

  it('keeps big payouts readable: at most four coin flights', () => {
    const many = Array.from({ length: 6 }, () => ({ type: 'paidEach' as const, player: 0, each: 100_000 }));
    expect(effectsFor(many, game).filter((e) => e.kind === 'money')).toHaveLength(4);
  });

  it('shows building, jail, bankruptcy and festivals', () => {
    const kinds = effectsFor(
      [
        { type: 'builtHouse', player: 0, space: 6, houses: 1, cost: 500_000 },
        { type: 'wentToJail', player: 0, reason: 'space' },
        { type: 'bankrupt', player: 2, creditor: null },
        { type: 'festival', festival: { id: 'chieuTrung', group: null }, round: 3 },
        { type: 'festivalGift', amount: 1_000_000 },
      ],
      game,
    ).map((e) => e.kind);
    expect(kinds).toEqual(['build', 'jail', 'bankrupt', 'festival', 'coinRain']);
  });
});

describe('dice going off the table', () => {
  it('holds the buttons back and plays the scene for how they got lost', () => {
    const lost = [{ type: 'diceFumbled', player: 1, how: 'dog' }] as const;
    expect(hasMotion(lost)).toBe(true);
    expect(effectsFor(lost, newGame())).toEqual([{ kind: 'fumble', player: 1, how: 'dog' }]);
  });
});
