// Where each board space sits on the 11×11 grid. Start is the bottom-right corner and play
// moves clockwise: along the bottom (Hà Tĩnh), up the left, across the top (Nghệ An), down the right.

export type Side = 'bottom' | 'left' | 'top' | 'right' | 'corner';

export interface CellPosition {
  row: number; // 0..10, top to bottom
  col: number; // 0..10, left to right
  side: Side;
}

export function cellPosition(index: number): CellPosition {
  if (index < 0 || index >= 40) throw new RangeError(`No board space ${index}`);
  const side: Side = index % 10 === 0 ? 'corner' : (['bottom', 'left', 'top', 'right'] as const)[Math.floor(index / 10)];
  if (index <= 10) return { row: 10, col: 10 - index, side };
  if (index <= 20) return { row: 20 - index, col: 0, side };
  if (index <= 30) return { row: 0, col: index - 20, side };
  return { row: index - 30, col: 10, side };
}
