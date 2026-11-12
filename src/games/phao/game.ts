// Pháo Tết, a push-your-luck card game, as a pure state machine like the other games:
// applyPhao(state, action) -> new state, for whoever's move it is. The input is never changed.
//
// The deck hides lit firecrackers, one fewer than there are players. On your turn, play as many cards as
// you like, then end it by drawing the top card. Draw a firecracker and you're out, unless you have a
// bucket of water: it puts the firecracker out, and you hide it back in the deck wherever you like
// (nobody else sees where). Cards can end your turn without drawing (Né, Đẩy), draw from the bottom
// instead (Rút đáy), show you the top three cards (Nhòm), shuffle the deck (Xóc), or take a card from
// someone (Xin, or a pair of the same food). The last player left wins the game.

import type { PlayerColorId } from '../../data/colors';
import type { TokenId } from '../../data/tokens';
import { shuffledDeck } from '../../engine/deck';
import { nextUint32 } from '../../engine/rng';
import type { BotLevel } from '../../engine/types';
import { byKind, cardsOf, isFood, kindOf, KINDS, type Card, type CardKind } from './cards';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
/** Cards dealt to each player, besides their own bucket of water. */
export const HAND_SIZE = 5;
/** Spare buckets of water shuffled into the deck (as many as are left, up to this). */
const SPARE_BUCKETS = 2;
const PEEK = 3;
const LOG_LIMIT = 200;

export interface PhaoPlayer {
  name: string;
  token: TokenId;
  color: PlayerColorId;
  bot?: BotLevel;
  hand: Card[];
  out: boolean; // blown up this game
}

export type PhaoPhase =
  | { kind: 'turn' } // the current player plays cards or draws
  | { kind: 'hide'; card: Card } // the current player put out a firecracker and hides it back in the deck
  | { kind: 'over'; winner: number };

export type PhaoLog =
  | { type: 'dealt'; game: number }
  | { type: 'played'; player: number; card: Card; target?: number }
  | { type: 'pair'; player: number; cards: [Card, Card]; target: number }
  | { type: 'took'; player: number; from: number; count: number } // what was taken is the two players' secret
  | { type: 'drew'; player: number; bottom: boolean } // a safe card
  | { type: 'putOut'; player: number } // drew a firecracker and put it out
  | { type: 'hid'; player: number } // ...and hid it back (where is their secret)
  | { type: 'exploded'; player: number }
  | { type: 'shuffled'; player: number }
  | { type: 'turns'; player: number; turns: number } // shoved: has to take this many turns
  | { type: 'won'; player: number };

export interface PhaoState {
  players: PhaoPlayer[];
  current: number;
  turns: number; // turns the current player still has to take (more than 1 after a shove)
  deck: Card[]; // face down; the top is the last
  discard: Card[];
  phase: PhaoPhase;
  peek: { player: number; cards: Card[] } | null; // what a Nhòm showed, top first, while it's still true
  game: number;
  scores: number[]; // games won
  log: PhaoLog[];
  rngState: number;
}

export type PhaoAction =
  | { type: 'PLAY'; card: Card; target?: number } // target: for Xin
  | { type: 'PAIR'; cards: [Card, Card]; target: number }
  | { type: 'DRAW' }
  | { type: 'HIDE'; position: number } // 0: on top … deck.length: at the bottom
  | { type: 'NEXT_GAME' };

export class PhaoError extends Error {}

export interface NewPhaoPlayer {
  name: string;
  token: TokenId;
  color: PlayerColorId;
  bot?: BotLevel;
}

export function createPhao({ players, seed }: { players: NewPhaoPlayer[]; seed: number }): PhaoState {
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) throw new PhaoError(`Pháo Tết needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
  const state: PhaoState = {
    players: players.map((p) => ({ ...p, hand: [], out: false })),
    current: 0,
    turns: 1,
    deck: [],
    discard: [],
    phase: { kind: 'turn' },
    peek: null,
    game: 0,
    scores: players.map(() => 0),
    log: [],
    rngState: seed >>> 0,
  };
  deal(state, 0);
  return state;
}

export function applyPhao(state: PhaoState, action: PhaoAction): PhaoState {
  const s = copyState(state);
  if (action.type === 'NEXT_GAME') {
    if (s.phase.kind !== 'over') throw new PhaoError('The game is still going');
    deal(s, s.phase.winner); // the winner starts the next game
  } else if (action.type === 'HIDE') {
    if (s.phase.kind !== 'hide') throw new PhaoError('Nothing to hide');
    hide(s, s.phase.card, action.position);
  } else {
    if (s.phase.kind !== 'turn') throw new PhaoError(s.phase.kind === 'over' ? 'The game is over' : 'Hide the firecracker first');
    if (action.type === 'PLAY') play(s, action.card, action.target);
    else if (action.type === 'PAIR') pair(s, action.cards, action.target);
    else drawCard(s, false);
  }
  if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT);
  return s;
}

/** Firecrackers still in the deck: everyone can count them (one fewer than the players still in). */
export const firecrackersLeft = (state: PhaoState): number => stillIn(state).length - 1 - (state.phase.kind === 'hide' ? 1 : 0);

/** The players a Xin or a pair could take a card from: still in, with cards. */
export const targets = (state: PhaoState): number[] => state.players.flatMap((p, i) => (i !== state.current && !p.out && p.hand.length > 0 ? [i] : []));

/** Whether the current player may play this card on its own now. */
export function canPlay(state: PhaoState, card: Card): boolean {
  if (state.phase.kind !== 'turn' || !state.players[state.current].hand.includes(card)) return false;
  const kind = kindOf(card);
  if (kind === 'xin') return targets(state).length > 0;
  return kind === 'ne' || kind === 'day' || kind === 'nhom' || kind === 'xoc' || kind === 'day2';
}

/** Pairs of the same food in the current player's hand (when someone has a card to take). */
export function foodPairs(state: PhaoState): [Card, Card][] {
  if (state.phase.kind !== 'turn' || targets(state).length === 0) return [];
  const hand = state.players[state.current].hand;
  const byFood = new Map<CardKind, Card[]>();
  for (const c of hand) if (isFood(c)) byFood.set(kindOf(c), [...(byFood.get(kindOf(c)) ?? []), c]);
  return [...byFood.values()].filter((cs) => cs.length >= 2).map((cs) => [cs[0], cs[1]]);
}

/** The players still in, in seat order. */
export const stillIn = (state: PhaoState): number[] => state.players.flatMap((p, i) => (p.out ? [] : [i]));

/** The next player still in after `from`. */
export function nextIn(state: Pick<PhaoState, 'players'>, from: number): number {
  const n = state.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (!state.players[i].out) return i;
  }
  return from;
}

// ---------------------------------------------------------------------------

function copyState(state: PhaoState): PhaoState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, hand: [...p.hand] })),
    deck: [...state.deck],
    discard: [...state.discard],
    peek: state.peek && { ...state.peek, cards: [...state.peek.cards] },
    scores: [...state.scores],
    log: [...state.log],
  };
}

/** A random whole number in [0, n). */
function random(s: PhaoState, n: number): number {
  const [r, next] = nextUint32(s.rngState);
  s.rngState = next;
  return r % n;
}

function shuffle(s: PhaoState, cards: Card[]): Card[] {
  const [order, rng] = shuffledDeck(cards.length, s.rngState);
  s.rngState = rng;
  return order.map((i) => cards[i]);
}

/**
 * A new game: everyone gets a bucket of water and five cards; then one firecracker fewer than the players
 * and the spare buckets are shuffled into what's left.
 */
function deal(s: PhaoState, first: number): void {
  const n = s.players.length;
  const buckets = cardsOf('xo');
  const firecrackers = cardsOf('phao').slice(0, n - 1);
  const rest = shuffle(
    s,
    KINDS.flatMap((k, i) => (k === 'phao' || k === 'xo' ? [] : [i])),
  );
  s.players.forEach((p, i) => {
    p.hand = [buckets[i], ...rest.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE)].sort(byKind);
    p.out = false;
  });
  const spare = buckets.slice(n, n + SPARE_BUCKETS);
  s.deck = shuffle(s, [...rest.slice(n * HAND_SIZE), ...firecrackers, ...spare]);
  s.discard = [];
  s.game++;
  s.phase = { kind: 'turn' };
  s.peek = null;
  s.current = first;
  s.turns = 1;
  s.log.push({ type: 'dealt', game: s.game });
}

function discardFromHand(s: PhaoState, player: number, cards: Card[]): void {
  const p = s.players[player];
  for (const c of cards) {
    if (!p.hand.includes(c)) throw new PhaoError('That card is not in this hand');
  }
  p.hand = p.hand.filter((c) => !cards.includes(c));
  s.discard.push(...cards);
}

function checkTarget(s: PhaoState, target: number | undefined): number {
  if (target === undefined || !targets(s).includes(target)) throw new PhaoError('Take a card from someone still in who has cards');
  return target;
}

/** A card at random from `from` to the current player. */
function takeRandom(s: PhaoState, from: number): void {
  const giver = s.players[from];
  const card = giver.hand[random(s, giver.hand.length)];
  giver.hand = giver.hand.filter((c) => c !== card);
  const me = s.players[s.current];
  me.hand = [...me.hand, card].sort(byKind);
  s.log.push({ type: 'took', player: s.current, from, count: 1 });
}

function play(s: PhaoState, card: Card, target?: number): void {
  if (!canPlay(s, card)) throw new PhaoError('That card cannot be played now');
  const kind = kindOf(card);
  if (kind === 'xin') checkTarget(s, target);
  discardFromHand(s, s.current, [card]);
  s.log.push(kind === 'xin' ? { type: 'played', player: s.current, card, target } : { type: 'played', player: s.current, card });
  switch (kind) {
    case 'ne':
      endTurn(s);
      break;
    case 'day': {
      // Shoved: the next player takes two turns, and this player's turns are over.
      const next = nextIn(s, s.current);
      passTo(s, next, 2);
      s.log.push({ type: 'turns', player: next, turns: 2 });
      break;
    }
    case 'nhom':
      s.peek = { player: s.current, cards: s.deck.slice(-PEEK).reverse() };
      break;
    case 'xoc':
      s.deck = shuffle(s, s.deck);
      s.peek = null;
      s.log.push({ type: 'shuffled', player: s.current });
      break;
    case 'day2':
      drawCard(s, true);
      break;
    case 'xin':
      takeRandom(s, target!);
      break;
  }
}

function pair(s: PhaoState, cards: [Card, Card], target: number): void {
  if (!Array.isArray(cards) || cards.length !== 2 || cards[0] === cards[1]) throw new PhaoError('A pair is two cards');
  if (!isFood(cards[0]) || kindOf(cards[0]) !== kindOf(cards[1])) throw new PhaoError('A pair is two of the same food');
  checkTarget(s, target);
  discardFromHand(s, s.current, cards);
  s.log.push({ type: 'pair', player: s.current, cards: [cards[0], cards[1]], target });
  takeRandom(s, target);
}

/** Drawing ends the turn, unless it's a firecracker: then a bucket puts it out, or the player is out. */
function drawCard(s: PhaoState, bottom: boolean): void {
  const card = bottom ? s.deck.shift()! : s.deck.pop()!;
  s.peek = null; // the top cards have moved
  const me = s.players[s.current];
  if (kindOf(card) !== 'phao') {
    me.hand = [...me.hand, card].sort(byKind);
    s.log.push({ type: 'drew', player: s.current, bottom });
    endTurn(s);
    return;
  }
  const bucket = me.hand.find((c) => kindOf(c) === 'xo');
  if (bucket !== undefined) {
    discardFromHand(s, s.current, [bucket]);
    s.log.push({ type: 'putOut', player: s.current });
    s.phase = { kind: 'hide', card };
    return;
  }
  // Boom.
  me.out = true;
  s.discard.push(card, ...me.hand);
  me.hand = [];
  s.log.push({ type: 'exploded', player: s.current });
  const left = stillIn(s);
  if (left.length === 1) {
    win(s, left[0]);
    return;
  }
  passTo(s, nextIn(s, s.current), 1);
}

function hide(s: PhaoState, card: Card, position: number): void {
  if (!Number.isInteger(position) || position < 0 || position > s.deck.length) throw new PhaoError('Not a place in the deck');
  s.deck.splice(s.deck.length - position, 0, card);
  s.phase = { kind: 'turn' };
  s.log.push({ type: 'hid', player: s.current });
  endTurn(s);
}

/** One of the current player's turns is over: they go again if they owe more, otherwise the next player. */
function endTurn(s: PhaoState): void {
  if (s.turns > 1) {
    s.turns--;
    return;
  }
  passTo(s, nextIn(s, s.current), 1);
}

function passTo(s: PhaoState, player: number, turns: number): void {
  if (s.peek && s.peek.player !== player) s.peek = null; // what someone saw is theirs only while it's their turn
  s.current = player;
  s.turns = turns;
}

function win(s: PhaoState, player: number): void {
  s.scores[player]++;
  s.phase = { kind: 'over', winner: player };
  s.peek = null;
  s.turns = 1;
  s.log.push({ type: 'won', player });
}
