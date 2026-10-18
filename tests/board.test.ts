import { describe, expect, it } from 'vitest';
import { BOARD, BOARD_SIZE, GROUP_SPACES } from '../src/data/board';

const indicesOf = (kind: string) =>
  BOARD.flatMap((space, i) => (space.kind === kind ? [i] : []));

describe('board', () => {
  it('has 40 spaces with the four corners in place', () => {
    expect(BOARD).toHaveLength(BOARD_SIZE);
    expect(BOARD[0].kind).toBe('start');
    expect(BOARD[10].kind).toBe('jail');
    expect(BOARD[20].kind).toBe('rest');
    expect(BOARD[30].kind).toBe('goToJail');
  });

  it('has the classic layout of special spaces', () => {
    expect(indicesOf('transport')).toEqual([5, 15, 25, 35]);
    expect(indicesOf('utility')).toEqual([12, 28]);
    expect(indicesOf('tax')).toEqual([4, 38]);
    expect(indicesOf('card')).toEqual([2, 7, 17, 22, 33, 36]);
  });

  it('has 22 properties in 8 color groups', () => {
    expect(indicesOf('property')).toHaveLength(22);
    const sizes = Object.values(GROUP_SPACES).map((g) => g.length);
    expect(sizes).toEqual([2, 3, 3, 3, 3, 3, 3, 2]);
  });

  it('gets more expensive around the board', () => {
    const prices = BOARD.flatMap((s) => (s.kind === 'property' ? [s.price] : []));
    for (let i = 1; i < prices.length; i++) expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
  });

  it('matches the prices in SPEC.md', () => {
    const price = (i: number) => {
      const s = BOARD[i];
      return s.kind === 'property' || s.kind === 'transport' || s.kind === 'utility' ? s.price : null;
    };
    expect(price(1)).toBe(600_000);
    expect(price(9)).toBe(1_200_000);
    expect(price(19)).toBe(2_000_000);
    expect(price(37)).toBe(3_500_000);
    expect(price(39)).toBe(4_000_000);
    expect(price(25)).toBe(2_000_000);
    expect(price(28)).toBe(1_500_000);
  });

  it('starts in Hà Tĩnh, crosses Bến Thủy, and ends in Vinh', () => {
    expect(BOARD[1].name.vi).toBe('Vườn bưởi Phúc Trạch');
    expect(BOARD[20].name.vi).toBe('Cầu Bến Thủy');
    expect(BOARD[39].name.vi).toBe('Đường Quang Trung');
  });

  it('has every name in both languages', () => {
    for (const space of BOARD) {
      expect(space.name.vi.trim()).not.toBe('');
      expect(space.name.en.trim()).not.toBe('');
    }
  });
});
