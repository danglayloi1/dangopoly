import type { LocalText } from './text';

// The colors players can pick, in natural pigments that read well on paper and on lacquer.
// Yellow is left out: it is too faint as text on the paper background.
export const PLAYER_COLORS = [
  { id: 'red', hex: '#b8322a', name: { vi: 'Đỏ son', en: 'Vermilion' } },
  { id: 'indigo', hex: '#2f5d8a', name: { vi: 'Chàm', en: 'Indigo' } },
  { id: 'green', hex: '#4f7a3a', name: { vi: 'Xanh lá', en: 'Leaf green' } },
  { id: 'purple', hex: '#7a4a8a', name: { vi: 'Tím', en: 'Purple' } },
  { id: 'orange', hex: '#c8661e', name: { vi: 'Cam', en: 'Orange' } },
  { id: 'teal', hex: '#2b7a78', name: { vi: 'Xanh ngọc', en: 'Teal' } },
  { id: 'pink', hex: '#b0466c', name: { vi: 'Hồng sen', en: 'Lotus pink' } },
  { id: 'brown', hex: '#6e4426', name: { vi: 'Nâu', en: 'Brown' } },
] as const satisfies readonly { id: string; hex: string; name: LocalText }[];

export type PlayerColorId = (typeof PLAYER_COLORS)[number]['id'];

export const PLAYER_COLOR_IDS: readonly PlayerColorId[] = PLAYER_COLORS.map((c) => c.id);

/** The color a seat gets unless the player picks another (also used for saves made before colors could be picked). */
export const defaultPlayerColor = (seat: number): PlayerColorId => PLAYER_COLOR_IDS[seat % PLAYER_COLOR_IDS.length];
