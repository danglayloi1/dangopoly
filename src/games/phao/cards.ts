// Pháo Tết's cards: 49 in all, numbered 0..48. Each number is one card; KINDS says what it is.
//
//   Pháo        3   a lit firecracker: draw it and you're out, unless you have a water bucket
//   Xô nước     6   a bucket of water: puts out a firecracker (then you hide it back in the deck)
//   Né          4   end your turn without drawing
//   Đẩy         4   end your turn without drawing; the next player takes two turns
//   Nhòm        4   look at the top three cards
//   Xóc         4   shuffle the deck
//   Rút đáy     4   end your turn by drawing the bottom card instead of the top one
//   Xin         4   take a card at random from another player
//   foods     4×4   bánh chưng, kẹo cu đơ, cam Vinh, nhút: a pair of the same takes a card at random

export type Card = number;

export type CardKind = 'phao' | 'xo' | 'ne' | 'day' | 'nhom' | 'xoc' | 'day2' | 'xin' | 'banhChung' | 'cuDo' | 'camVinh' | 'nhut';

export const FOODS: readonly CardKind[] = ['banhChung', 'cuDo', 'camVinh', 'nhut'];
/** The cards that do something when played on their own (foods go in pairs; buckets and firecrackers aren't played). */
export const ACTIONS: readonly CardKind[] = ['ne', 'day', 'nhom', 'xoc', 'day2', 'xin'];

const COUNTS: [CardKind, number][] = [
  ['phao', 3],
  ['xo', 6],
  ['ne', 4],
  ['day', 4],
  ['nhom', 4],
  ['xoc', 4],
  ['day2', 4],
  ['xin', 4],
  ['banhChung', 4],
  ['cuDo', 4],
  ['camVinh', 4],
  ['nhut', 4],
];

/** Every card's kind, by number. */
export const KINDS: readonly CardKind[] = COUNTS.flatMap(([kind, n]) => Array<CardKind>(n).fill(kind));
export const DECK_SIZE = KINDS.length; // 49

export const kindOf = (card: Card): CardKind => KINDS[card];
export const isFood = (card: Card): boolean => FOODS.includes(KINDS[card]);

/** All the cards of a kind, in order. */
export const cardsOf = (kind: CardKind): Card[] => KINDS.flatMap((k, i) => (k === kind ? [i] : []));

const ORDER: readonly CardKind[] = ['xo', 'ne', 'day', 'nhom', 'xoc', 'day2', 'xin', 'banhChung', 'cuDo', 'camVinh', 'nhut', 'phao'];
/** A hand in order: the bucket first, then the actions, then the foods. */
export const byKind = (a: Card, b: Card): number => ORDER.indexOf(KINDS[a]) - ORDER.indexOf(KINDS[b]) || a - b;

/** Cards by kind, for tests and the lesson: "nhom, ne, banhChung, banhChung"; each takes the next free card of that kind. */
export function pick(text: string, taken: Set<Card> = new Set()): Card[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((word) => {
      const card = cardsOf(word as CardKind).find((c) => !taken.has(c));
      if (card === undefined) throw new Error(`No more cards: ${word}`);
      taken.add(card);
      return card;
    });
}
