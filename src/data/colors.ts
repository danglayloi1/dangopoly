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
  // Two colours: the token's disc is split between them.
  { id: 'redGold', hex: '#a8281f', second: '#e0b13a', name: { vi: 'Đỏ vàng', en: 'Red and gold' } },
  { id: 'seaSand', hex: '#24507a', second: '#e8d9b0', name: { vi: 'Biển và cát', en: 'Sea and sand' } },
  { id: 'ripeRice', hex: '#3f6b2c', second: '#d9a62e', name: { vi: 'Lúa chín', en: 'Ripe rice' } },
  { id: 'lotus', hex: '#a23d62', second: '#6f9a4a', name: { vi: 'Sen hồng lá xanh', en: 'Lotus' } },
  { id: 'moonNight', hex: '#1f2f4f', second: '#b9c2cc', name: { vi: 'Đêm trăng', en: 'Moonlit night' } },
  { id: 'coconut', hex: '#5e3a20', second: '#f0e2c0', name: { vi: 'Kẹo dừa', en: 'Coconut candy' } },
] as const satisfies readonly { id: string; hex: string; second?: string; name: LocalText }[];

export type PlayerColorId = (typeof PLAYER_COLORS)[number]['id'];

export const PLAYER_COLOR_IDS: readonly PlayerColorId[] = PLAYER_COLORS.map((c) => c.id);

/**
 * The second colour of a two-colour choice, by its first colour (every first colour is different):
 * the token drawings look it up from the colour they're given, so nothing else needs to know.
 */
export const SECOND_COLOR: Readonly<Record<string, string>> = Object.fromEntries(
  PLAYER_COLORS.flatMap((c) => ('second' in c ? [[c.hex, c.second]] : [])),
);

/** The color a seat gets unless the player picks another (also used for saves made before colors could be picked). */
export const defaultPlayerColor = (seat: number): PlayerColorId => PLAYER_COLOR_IDS[seat % PLAYER_COLOR_IDS.length];
