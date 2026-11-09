// Tiến lên: a normal 52-card deck. A card is a number 0..51, and bigger numbers are stronger:
// the rank comes first (3 is the lowest, then 4 … 10, J, Q, K, A, and 2, "heo", the highest),
// then the suit (♠ < ♣ < ♦ < ♥). So comparing two cards is just comparing two numbers.

export type Card = number;

export const SUITS = ['♠', '♣', '♦', '♥'] as const;
export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;
export type SuitName = (typeof SUITS)[number];
export type RankName = (typeof RANKS)[number];

export const DECK_SIZE = 52;
export const HAND_SIZE = 13;
/** The rank of the 2s ("heo"): they can't be part of a straight, and only bombs beat them. */
export const TWO = 12;

/** 0 for 3s … 11 for aces, 12 for 2s. */
export const rankOf = (card: Card): number => Math.floor(card / 4);
/** 0 ♠, 1 ♣, 2 ♦, 3 ♥. */
export const suitOf = (card: Card): number => card % 4;
export const isRed = (card: Card): boolean => suitOf(card) >= 2;

export function cardName(card: Card): string {
  return `${RANKS[rankOf(card)]}${SUITS[suitOf(card)]}`;
}

/** "10♥" → its card number (for tests and logs). Throws on anything else. */
export function parseCard(text: string): Card {
  const suit = SUITS.indexOf(text.slice(-1) as SuitName);
  const rank = RANKS.indexOf(text.slice(0, -1) as RankName);
  if (suit < 0 || rank < 0) throw new Error(`Not a card: ${text}`);
  return rank * 4 + suit;
}

/** "3♠ 4♠ 5♦" → cards. */
export const parseCards = (text: string): Card[] => text.trim().split(/\s+/).map(parseCard);

export const byStrength = (a: Card, b: Card): number => a - b;
