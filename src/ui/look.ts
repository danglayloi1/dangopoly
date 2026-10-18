// Visual details that aren't game rules: player colors and space icons.

import { BOARD, type ColorGroup } from '../data/board';

/** One color per seat, used for tokens, ownership marks and the player list. */
export const PLAYER_COLORS = ['#d64545', '#2d7dd2', '#2e9d5b', '#8e5bd6'] as const;

export const GROUP_COLORS: Record<ColorGroup, string> = {
  brown: '#8b5a3c',
  lightblue: '#7cc6e8',
  pink: '#e05ba1',
  orange: '#f39237',
  red: '#d64545',
  yellow: '#f2c94c',
  green: '#3fa66b',
  darkblue: '#2d4f9e',
};

const TRANSPORT_ICONS: Record<number, string> = { 5: '🚌', 15: '🚢', 25: '🚆', 35: '✈️' };
const UTILITY_ICONS: Record<number, string> = { 12: '⚡', 28: '💧' };

/** An emoji for spaces that aren't colored properties, or null. */
export function spaceIcon(index: number): string | null {
  const space = BOARD[index];
  switch (space.kind) {
    case 'start':
      return '🏁';
    case 'jail':
      return '🔒';
    case 'rest':
      return '🌉';
    case 'goToJail':
      return '👮';
    case 'card':
      return space.deck === 'chance' ? '❓' : '🎁';
    case 'tax':
      return '🧾';
    case 'transport':
      return TRANSPORT_ICONS[index] ?? '🚌';
    case 'utility':
      return UTILITY_ICONS[index] ?? '⚡';
    case 'property':
      return null;
  }
}
