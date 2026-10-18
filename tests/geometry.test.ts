import { describe, expect, it } from 'vitest';
import { cellPosition } from '../src/ui/geometry';

describe('cellPosition', () => {
  it('puts the corners in the corners', () => {
    expect(cellPosition(0)).toEqual({ row: 10, col: 10, side: 'corner' });
    expect(cellPosition(10)).toEqual({ row: 10, col: 0, side: 'corner' });
    expect(cellPosition(20)).toEqual({ row: 0, col: 0, side: 'corner' });
    expect(cellPosition(30)).toEqual({ row: 0, col: 10, side: 'corner' });
  });

  it('places every space on the edge exactly once', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const { row, col } = cellPosition(i);
      expect(row === 0 || row === 10 || col === 0 || col === 10).toBe(true);
      seen.add(`${row},${col}`);
    }
    expect(seen.size).toBe(40);
  });

  it('moves to a neighbouring cell each step', () => {
    for (let i = 0; i < 40; i++) {
      const a = cellPosition(i);
      const b = cellPosition((i + 1) % 40);
      expect(Math.abs(a.row - b.row) + Math.abs(a.col - b.col)).toBe(1);
    }
  });

  it('knows which side each space is on', () => {
    expect(cellPosition(5).side).toBe('bottom');
    expect(cellPosition(15).side).toBe('left');
    expect(cellPosition(25).side).toBe('top');
    expect(cellPosition(35).side).toBe('right');
  });

  it('rejects spaces off the board', () => {
    expect(() => cellPosition(40)).toThrow(RangeError);
  });
});
