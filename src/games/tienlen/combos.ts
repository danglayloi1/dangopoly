// What may be played in Tiến lên, and what beats what.

import { byStrength, rankOf, TWO, type Card } from './cards';

/**
 * single · pair (đôi) · triple (sám) · quad (tứ quý) · straight (sảnh: 3+ ranks in a row) ·
 * pairRun (đôi thông: 3+ pairs in a row). Neither kind of run may hold a 2.
 */
export type ComboKind = 'single' | 'pair' | 'triple' | 'quad' | 'straight' | 'pairRun';

export interface Combo {
  kind: ComboKind;
  cards: Card[]; // weakest first
  size: number; // how many ranks it spans: 1 for singles and sets, the length for runs
  top: Card; // its strongest card, which decides between two combos of the same shape
}

const SETS: Record<number, ComboKind> = {
  1: 'single',
  2: 'pair',
  3: 'triple',
  4: 'quad',
};

/** The combo these cards make, or null if they don't make one. */
export function comboOf(cards: readonly Card[]): Combo | null {
  if (cards.length === 0 || new Set(cards).size !== cards.length) return null;
  const sorted = [...cards].sort(byStrength);
  const ranks = sorted.map(rankOf);
  const top = sorted[sorted.length - 1];
  if (ranks.every((r) => r === ranks[0])) return SETS[sorted.length] ? { kind: SETS[sorted.length], cards: sorted, size: 1, top } : null;
  if (ranks.includes(TWO)) return null;
  if (sorted.length >= 3 && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1)) {
    return { kind: 'straight', cards: sorted, size: sorted.length, top };
  }
  const pairsInARow = ranks.every((r, i) => (i % 2 === 1 ? r === ranks[i - 1] : i === 0 || r === ranks[i - 1] + 1));
  if (sorted.length >= 6 && sorted.length % 2 === 0 && pairsInARow) return { kind: 'pairRun', cards: sorted, size: sorted.length / 2, top };
  return null;
}

const isTwos = (c: Combo): boolean => (c.kind === 'single' || c.kind === 'pair') && rankOf(c.top) === TWO;

/**
 * Whether `play` beats `table`. Normally it must be the same shape and higher (its top card is
 * stronger). The bombs ("chặt") break that rule:
 * - three pairs in a row (3 đôi thông) beat a single 2, and a higher three-pair run;
 * - four of a kind (tứ quý) beats a single 2, a pair of 2s, three pairs in a row, and a lower four;
 * - four pairs in a row (4 đôi thông) beat all of those.
 */
export function beats(play: Combo, table: Combo): boolean {
  if (play.kind === table.kind && play.size === table.size) return play.top > table.top;
  const fourPairs = play.kind === 'pairRun' && play.size >= 4;
  if (table.kind === 'single' && isTwos(table)) return play.kind === 'quad' || (play.kind === 'pairRun' && play.size >= 3);
  if (table.kind === 'pair' && isTwos(table)) return play.kind === 'quad' || fourPairs;
  if (table.kind === 'pairRun' && table.size === 3) return play.kind === 'quad' || fourPairs;
  if (table.kind === 'quad') return fourPairs;
  return false;
}

/** Whether a play counts as a bomb ("chặt") against what's on the table. */
export function isChop(play: Combo, table: Combo | null): boolean {
  return table !== null && (play.kind !== table.kind || play.size !== table.size);
}

/** Every k-card choice from these cards, in order. */
function choose(cards: readonly Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  const out: Card[][] = [];
  cards.forEach((c, i) => {
    for (const rest of choose(cards.slice(i + 1), k - 1)) out.push([c, ...rest]);
  });
  return out;
}

/**
 * Every combo a hand could play. Runs use the weakest card of each rank except the top one, where
 * every choice is listed (the top card is what decides whether a run beats another).
 */
export function combosIn(hand: readonly Card[]): Combo[] {
  const byRank: Card[][] = Array.from({ length: 13 }, () => []);
  for (const c of [...hand].sort(byStrength)) byRank[rankOf(c)].push(c);
  const out: Combo[] = [];
  const add = (cards: Card[]) => {
    const combo = comboOf(cards);
    if (combo) out.push(combo);
  };

  for (const cards of byRank) for (let k = 1; k <= cards.length; k++) for (const set of choose(cards, k)) add(set);

  for (let start = 0; start < TWO; start++) {
    // Straights from this rank up.
    for (let end = start; end < TWO && byRank[end].length > 0; end++) {
      if (end - start + 1 < 3) continue;
      const below = byRank.slice(start, end).map((cards) => cards[0]);
      for (const top of byRank[end]) add([...below, top]);
    }
    // Pairs in a row from this rank up.
    for (let end = start; end < TWO && byRank[end].length >= 2; end++) {
      if (end - start + 1 < 3) continue;
      const below = byRank.slice(start, end).flatMap((cards) => cards.slice(0, 2));
      for (const top of choose(byRank[end], 2)) add([...below, ...top]);
    }
  }
  return out;
}
