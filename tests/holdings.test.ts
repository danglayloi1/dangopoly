import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/game';
import type { GameState } from '../src/engine/types';
import { holdingsOf } from '../src/ui/holdings';

function gameWith(ownership: Record<number, number>): GameState {
  const game = createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
    ],
    seed: 1,
  });
  for (const [space, owner] of Object.entries(ownership)) {
    game.ownership[Number(space)] = { owner, houses: 0, mortgaged: false };
  }
  return game;
}

describe('holdingsOf', () => {
  it('is empty for a player with no properties', () => {
    expect(holdingsOf(gameWith({}), 0)).toEqual([]);
  });

  it('groups properties by color set with counts', () => {
    // Hồ Kẻ Gỗ (8) and Cửa khẩu Cầu Treo (9) are light blue; Sơn Kim (6) belongs to Lan.
    const holdings = holdingsOf(gameWith({ 8: 0, 9: 0, 6: 1 }), 0);
    expect(holdings).toEqual([{ kind: 'lightblue', owned: [8, 9], total: 3, fullSet: false }]);
  });

  it('marks a complete color set', () => {
    const holdings = holdingsOf(gameWith({ 1: 0, 3: 0 }), 0);
    expect(holdings).toEqual([{ kind: 'brown', owned: [1, 3], total: 2, fullSet: true }]);
  });

  it('lists color sets in board order, then transport, then utilities', () => {
    const holdings = holdingsOf(gameWith({ 39: 0, 28: 0, 5: 0, 1: 0, 35: 0 }), 0);
    expect(holdings.map((h) => h.kind)).toEqual(['brown', 'darkblue', 'transport', 'utility']);
    expect(holdings[2]).toEqual({ kind: 'transport', owned: [5, 35], total: 4, fullSet: false });
  });

  it('never calls transport or utilities a full set', () => {
    const holdings = holdingsOf(gameWith({ 12: 0, 28: 0 }), 0);
    expect(holdings).toEqual([{ kind: 'utility', owned: [12, 28], total: 2, fullSet: false }]);
  });
});
