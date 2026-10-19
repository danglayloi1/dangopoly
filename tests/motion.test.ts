import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { applyAction, createGame } from '../src/engine/game';
import type { GameState, LogEntry } from '../src/engine/types';
import { hasMotion, newLogEntries, planMoves, soundFor, stepPath } from '../src/ui/motion';

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
    expect(newLogEntries(structuredClone(game.log), applyAction(game, { type: 'ROLL', dice: [1, 2] }).log)).toEqual([]);
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
