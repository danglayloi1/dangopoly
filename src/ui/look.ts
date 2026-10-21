// Visual details that aren't game rules: player colors and space icons.

import type { ColorGroup } from '../data/board';
import { PLAYER_COLORS, type PlayerColorId } from '../data/colors';

export const colorHex = (id: PlayerColorId): string => PLAYER_COLORS.find((c) => c.id === id)!.hex;

/** A player's chosen color, used for tokens, ownership marks and the player list. */
export const playerColor = (player: { color: PlayerColorId }): string => colorHex(player.color);

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

// Each set also has its own folk motif on top of its color, so sets can be told apart without
// relying on color alone: wood grain, river waves, lotus, pomelo, lattice, rice, bamboo, clouds.
const LIGHT = 'rgba(255,248,230,0.5)';
const MOTIFS: Record<ColorGroup, { w: number; h: number; svg: string }> = {
  brown: { w: 10, h: 10, svg: `<path d="M0 3Q5 1 10 3M0 8Q5 6 10 8" stroke="${LIGHT}" fill="none"/>` },
  lightblue: { w: 12, h: 8, svg: `<path d="M0 6Q3 1 6 6T12 6" stroke="${LIGHT}" stroke-width="1.3" fill="none"/>` },
  pink: { w: 10, h: 10, svg: `<path d="M5 1.5Q8.5 5 5 8.5Q1.5 5 5 1.5Z" fill="${LIGHT}"/>` },
  orange: { w: 8, h: 8, svg: `<circle cx="4" cy="4" r="1.7" fill="${LIGHT}"/>` },
  red: { w: 8, h: 8, svg: `<path d="M0 0L8 8M8 0L0 8" stroke="rgba(240,190,110,0.6)" stroke-width="0.9"/>` },
  yellow: { w: 8, h: 8, svg: '<path d="M4 1L5.2 4L4 7L2.8 4Z" fill="rgba(90,55,0,0.4)"/>' },
  green: { w: 10, h: 10, svg: `<path d="M1 9Q5 5 9 1M5 5Q7 6 8 8" stroke="${LIGHT}" fill="none"/>` },
  darkblue: { w: 12, h: 10, svg: '<path d="M2 7Q2 3 6 3Q9 3 9 6Q9 8 7 8" stroke="rgba(217,174,79,0.8)" fill="none"/>' },
};

/** A CSS background for a color set: its motif tiled over its color. */
export function groupFill(group: ColorGroup): string {
  const { w, h, svg } = MOTIFS[group];
  const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(tile)}"), ${GROUP_COLORS[group]}`;
}

// Space icons are drawn in icons.tsx.
export { spaceIcon } from './icons';
