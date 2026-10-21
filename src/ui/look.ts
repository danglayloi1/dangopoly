// Visual details that aren't game rules: player colors and space icons.

import type { ColorGroup } from '../data/board';

/** One color per seat, used for tokens, ownership marks and the player list. */
export const PLAYER_COLORS = ['#b8322a', '#2f5d8a', '#4f7a3a', '#7a4a8a'] as const;

// Natural-pigment versions of the classic 8 set colors (kept clearly different from each other).
export const GROUP_COLORS: Record<ColorGroup, string> = {
  brown: '#7a4a2c',
  lightblue: '#6fa8c4',
  pink: '#c95b7b',
  orange: '#d9822b',
  red: '#b8322a',
  yellow: '#d9a62e',
  green: '#4f7a3a',
  darkblue: '#2f4f6f',
};

// Space icons are drawn in icons.tsx.
export { spaceIcon } from './icons';
