// Màu Mè's own deck: 104 cards in four folk colors (son, nghệ, lá, chàm) plus the wild ones.
//
// A card is a number 0..103. Each color has 24 cards (ids color*24 .. color*24+23): two of every
// number 1–9, then two each of Chặn (skip), Quay (reverse) and +2. Then come four Đổi màu (wild,
// 96–99) and four +4 (wild, the next player draws four; 100–103).

export type Card = number;

export const DECK_SIZE = 104;
export const COLORS = 4;
const PER_COLOR = 24;
const FIRST_WILD = 96;
const FIRST_WILD4 = 100;

// What's printed on a card: 1–9 for the numbers, then the action cards.
export const FACE_SKIP = 10;
export const FACE_REVERSE = 11;
export const FACE_DRAW2 = 12;
export const FACE_WILD = 13;
export const FACE_WILD4 = 14;

/** The card's color (0 son, 1 nghệ, 2 lá, 3 chàm), or -1 for a wild card. */
export const colorOf = (card: Card): number => (card < FIRST_WILD ? Math.floor(card / PER_COLOR) : -1);

/** What's printed on the card: 1–9, or one of the FACE_ numbers. */
export function faceOf(card: Card): number {
  if (card >= FIRST_WILD4) return FACE_WILD4;
  if (card >= FIRST_WILD) return FACE_WILD;
  const k = card % PER_COLOR;
  return k < 18 ? (k >> 1) + 1 : FACE_SKIP + ((k - 18) >> 1);
}

export const isWild = (card: Card): boolean => card >= FIRST_WILD;

/** The card with this color and face; `copy` picks between the identical ones (0–1, or 0–3 for wilds). */
export function makeCard(color: number, face: number, copy = 0): Card {
  if (face === FACE_WILD) return FIRST_WILD + copy;
  if (face === FACE_WILD4) return FIRST_WILD4 + copy;
  const k = face <= 9 ? (face - 1) * 2 : 18 + (face - FACE_SKIP) * 2;
  return color * PER_COLOR + k + copy;
}

/** What a card left in a hand is worth to the winner: its number, 20 for an action card, 50 for a wild one. */
export function cardPoints(card: Card): number {
  const face = faceOf(card);
  if (face <= 9) return face;
  return isWild(card) ? 50 : 20;
}

/** A hand in order: by color (wild cards last), then by face. */
export const byColor = (a: Card, b: Card): number => {
  const ca = isWild(a) ? COLORS : colorOf(a);
  const cb = isWild(b) ? COLORS : colorOf(b);
  return ca - cb || faceOf(a) - faceOf(b) || a - b;
};

// Each color also has a shape, so the cards can be told apart without seeing the colors.
export const COLOR_SHAPES = ['●', '▲', '■', '◆'];
export const COLOR_HEX = ['#c8372d', '#e0a01a', '#3f8a3c', '#2f4f8f'];
/** The ink that reads on each color: cream, except on nghệ (turmeric), which is too light for it. */
export const COLOR_INK = ['#fbf6e8', '#2b2420', '#fbf6e8', '#fbf6e8'];
/** The number's color on the cream cartouche: the card's own, a darker turmeric for nghệ. */
export const COLOR_FACE = ['#c8372d', '#946300', '#3f8a3c', '#2f4f8f'];

/** The face as printed on the card (numbers, ⊘, ⇄, +2, ✦, +4). */
export function faceLabel(card: Card): string {
  const face = faceOf(card);
  if (face <= 9) return String(face);
  return ['⊘', '⇄', '+2', '✦', '+4'][face - FACE_SKIP];
}

// For tests and the lesson: "son 7", "nghe skip", "la +2", "cham reverse", "wild", "+4".
const COLOR_WORDS = ['son', 'nghe', 'la', 'cham'];
const FACE_WORDS: Record<string, number> = { skip: FACE_SKIP, reverse: FACE_REVERSE, '+2': FACE_DRAW2 };

/** Cards from words, e.g. "son 7, nghe skip, wild, +4"; a second copy of the same card gets the next id. */
export function parseCards(text: string): Card[] {
  const used = new Set<Card>();
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((word) => {
      const [first, second] = word.split(/\s+/);
      let color = 0;
      let face: number;
      if (first === 'wild') face = FACE_WILD;
      else if (first === '+4') face = FACE_WILD4;
      else {
        color = COLOR_WORDS.indexOf(first);
        face = FACE_WORDS[second] ?? Number(second);
        if (color < 0 || !(face >= 1 && face <= FACE_DRAW2)) throw new Error(`Not a card: ${word}`);
      }
      const copies = face >= FACE_WILD ? 4 : 2;
      for (let copy = 0; copy < copies; copy++) {
        const card = makeCard(color, face, copy);
        if (!used.has(card)) {
          used.add(card);
          return card;
        }
      }
      throw new Error(`No more copies of ${word}`);
    });
}

export const parseCard = (text: string): Card => parseCards(text)[0];
