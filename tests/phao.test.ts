import { describe, expect, it } from 'vitest';
import { phaoBotAction } from '../src/games/phao/bot';
import { cardsOf, DECK_SIZE, kindOf, KINDS, pick, type Card } from '../src/games/phao/cards';
import {
  applyPhao,
  canPlay,
  createPhao,
  firecrackersLeft,
  foodPairs,
  HAND_SIZE,
  PhaoError,
  targets,
  type NewPhaoPlayer,
  type PhaoAction,
  type PhaoState,
} from '../src/games/phao/game';

const PEOPLE: NewPhaoPlayer[] = [
  { name: 'Đăng', token: 'nonLa', color: 'red' },
  { name: 'Lan', token: 'conTrau', color: 'indigo' },
  { name: 'Minh', token: 'quaCam', color: 'green' },
  { name: 'Hoa', token: 'xeDap', color: 'purple' },
];

/** A game with this deck (top card last) and these hands, Đăng to play. Every card is picked from one set. */
function withHands(deck: string, ...hands: string[]): PhaoState {
  const s = createPhao({ players: PEOPLE.slice(0, hands.length), seed: 1 });
  const taken = new Set<Card>();
  const dealt = hands.map((h) => pick(h, taken));
  return {
    ...s,
    players: s.players.map((p, i) => ({ ...p, hand: dealt[i], out: false })),
    deck: pick(deck, taken),
    discard: [],
    current: 0,
    turns: 1,
    phase: { kind: 'turn' },
    peek: null,
  };
}

const card = (s: PhaoState, player: number, kind: string): Card => s.players[player].hand.find((c) => kindOf(c) === kind)!;
const PLAY = (s: PhaoState, kind: string, target?: number): PhaoAction => ({
  type: 'PLAY',
  card: card(s, s.current, kind),
  ...(target === undefined ? {} : { target }),
});
const DRAW: PhaoAction = { type: 'DRAW' };
const all = (s: PhaoState) => [...s.deck, ...s.discard, ...s.players.flatMap((p) => p.hand), ...(s.phase.kind === 'hide' ? [s.phase.card] : [])];

describe('Pháo Tết cards', () => {
  it('has 49 cards: 3 firecrackers, 6 buckets, 4 of each action and 4 of each food', () => {
    expect(DECK_SIZE).toBe(49);
    expect(cardsOf('phao')).toHaveLength(3);
    expect(cardsOf('xo')).toHaveLength(6);
    for (const kind of ['ne', 'day', 'nhom', 'xoc', 'day2', 'xin', 'banhChung', 'cuDo', 'camVinh', 'nhut'] as const) expect(cardsOf(kind)).toHaveLength(4);
    expect(new Set(KINDS).size).toBe(12);
  });
});

describe('Pháo Tết', () => {
  it('deals a bucket and five cards each, and hides one firecracker fewer than the players', () => {
    for (const count of [2, 3, 4]) {
      for (let seed = 1; seed < 20; seed++) {
        const s = createPhao({ players: PEOPLE.slice(0, count), seed });
        for (const p of s.players) {
          expect(p.hand).toHaveLength(HAND_SIZE + 1);
          expect(p.hand.filter((c) => kindOf(c) === 'xo')).toHaveLength(1);
          expect(p.hand.some((c) => kindOf(c) === 'phao')).toBe(false);
        }
        expect(s.deck.filter((c) => kindOf(c) === 'phao')).toHaveLength(count - 1);
        expect(firecrackersLeft(s)).toBe(count - 1);
        expect(s.deck.filter((c) => kindOf(c) === 'xo')).toHaveLength(2);
        expect(new Set(all(s)).size).toBe(all(s).length);
      }
    }
  });

  it('drawing a safe card ends the turn', () => {
    const s = withHands('ne, nhom', 'xo', 'xo');
    const after = applyPhao(s, DRAW);
    expect(after.players[0].hand.map(kindOf)).toEqual(['xo', 'nhom']);
    expect(after.current).toBe(1);
    expect(after.log.at(-1)).toEqual({ type: 'drew', player: 0, bottom: false });
  });

  it('a firecracker with a bucket: put out, then hidden wherever the player says, and the turn ends', () => {
    const s = withHands('ne, nhom, banhChung, phao', 'xo, cuDo', 'xo');
    const putOut = applyPhao(s, DRAW);
    expect(putOut.phase.kind).toBe('hide');
    expect(putOut.players[0].hand.map(kindOf)).toEqual(['cuDo']);
    expect(putOut.current).toBe(0);
    expect(firecrackersLeft(putOut)).toBe(0); // it's out of the deck while being hidden
    expect(() => applyPhao(putOut, DRAW)).toThrow(PhaoError);
    expect(() => applyPhao(putOut, { type: 'HIDE', position: 4 })).toThrow(PhaoError);
    const second = applyPhao(putOut, { type: 'HIDE', position: 1 });
    expect(second.deck.map(kindOf)).toEqual(['ne', 'nhom', 'phao', 'banhChung']);
    expect(second.current).toBe(1);
    expect(second.log.at(-1)).toEqual({ type: 'hid', player: 0 }); // where is a secret
    expect(applyPhao(putOut, { type: 'HIDE', position: 0 }).deck.at(-1)).toBe(putOut.phase.kind === 'hide' ? putOut.phase.card : -1);
    expect(applyPhao(putOut, { type: 'HIDE', position: 3 }).deck[0]).toBe(putOut.phase.kind === 'hide' ? putOut.phase.card : -1);
  });

  it('a firecracker without a bucket: out, with the whole hand; the last one left wins', () => {
    const three = withHands('ne, phao', 'nhom, cuDo', 'xo', 'xo');
    const boom = applyPhao(three, DRAW);
    expect(boom.players[0].out).toBe(true);
    expect(boom.players[0].hand).toEqual([]);
    expect(boom.log.at(-1)).toEqual({ type: 'exploded', player: 0 });
    expect(boom.current).toBe(1);
    expect(boom.phase.kind).toBe('turn');

    const two = withHands('ne, phao', 'nhom', 'xo');
    const over = applyPhao(two, DRAW);
    expect(over.phase).toEqual({ kind: 'over', winner: 1 });
    expect(over.scores).toEqual([0, 1]);
    expect(() => applyPhao(over, DRAW)).toThrow(PhaoError);
    const again = applyPhao(over, { type: 'NEXT_GAME' });
    expect(again.game).toBe(2);
    expect(again.current).toBe(1); // the winner starts
    expect(again.players.every((p) => !p.out && p.hand.length === HAND_SIZE + 1)).toBe(true);
    expect(new Set(all(again)).size).toBe(DECK_SIZE - 2 - 2); // two firecrackers and two buckets sit out with two players
  });

  it('Né ends the turn without drawing; Đẩy makes the next player take two turns', () => {
    const s = withHands('banhChung, cuDo, camVinh, nhut', 'ne, day', 'xo', 'xo');
    const dodged = applyPhao(s, PLAY(s, 'ne'));
    expect(dodged.current).toBe(1);
    expect(dodged.deck).toHaveLength(4);

    const shoved = applyPhao(s, PLAY(s, 'day'));
    expect(shoved.current).toBe(1);
    expect(shoved.turns).toBe(2);
    expect(shoved.log.at(-1)).toEqual({ type: 'turns', player: 1, turns: 2 });
    const once = applyPhao(shoved, DRAW);
    expect(once.current).toBe(1);
    expect(once.turns).toBe(1);
    expect(applyPhao(once, DRAW).current).toBe(2);
  });

  it('Nhòm shows the top three to the player only while it stays true; Xóc shuffles', () => {
    const s = withHands('ne, day, xoc, nhut, phao', 'nhom, xoc, nhom', 'xo');
    const looked = applyPhao(s, PLAY(s, 'nhom'));
    expect(looked.peek).toEqual({ player: 0, cards: [s.deck[4], s.deck[3], s.deck[2]] });
    expect(looked.current).toBe(0);
    const shaken = applyPhao(looked, PLAY(looked, 'xoc'));
    expect(shaken.peek).toBeNull();
    expect([...shaken.deck].sort()).toEqual([...s.deck].sort());
    expect(shaken.log.at(-1)).toEqual({ type: 'shuffled', player: 0 });
  });

  it('Rút đáy draws the bottom card instead', () => {
    const s = withHands('banhChung, phao', 'day2', 'xo');
    const after = applyPhao(s, PLAY(s, 'day2'));
    expect(after.players[0].hand.map(kindOf)).toEqual(['banhChung']);
    expect(after.deck.map(kindOf)).toEqual(['phao']);
    expect(after.current).toBe(1);
  });

  it('Xin and a pair of the same food take a random card from someone still in with cards', () => {
    const s = withHands('ne', 'xin, banhChung, banhChung, cuDo', 'nhom, nhom', '');
    expect(targets(s)).toEqual([1]);
    expect(foodPairs(s)).toHaveLength(1);
    expect(() => applyPhao(s, PLAY(s, 'xin'))).toThrow(PhaoError);
    expect(() => applyPhao(s, PLAY(s, 'xin', 2))).toThrow(PhaoError); // no cards to take
    const begged = applyPhao(s, PLAY(s, 'xin', 1));
    expect(begged.players[0].hand).toHaveLength(4);
    expect(begged.players[1].hand).toHaveLength(1);
    expect(begged.log.at(-1)).toEqual({ type: 'took', player: 0, from: 1, count: 1 });
    expect(begged.current).toBe(0);

    const [a, b] = foodPairs(s)[0];
    const paired = applyPhao(s, { type: 'PAIR', cards: [a, b], target: 1 });
    expect(paired.players[0].hand).toHaveLength(3);
    expect(paired.discard).toEqual([a, b]);
    expect(() => applyPhao(s, { type: 'PAIR', cards: [a, card(s, 0, 'cuDo')], target: 1 })).toThrow(PhaoError);
    expect(() => applyPhao(s, { type: 'PAIR', cards: [a, a], target: 1 })).toThrow(PhaoError);
  });

  it('buckets and firecrackers are never played, and food only in pairs', () => {
    const s = withHands('ne', 'xo, banhChung, phao', 'nhom');
    for (const c of s.players[0].hand) expect(canPlay(s, c)).toBe(false);
    expect(() => applyPhao(s, PLAY(s, 'xo'))).toThrow(PhaoError);
  });

  it('never changes the state it was given', () => {
    const s = withHands('ne, phao', 'xo, nhom, xin', 'cuDo');
    const copy = structuredClone(s);
    let t = applyPhao(s, PLAY(s, 'nhom'));
    t = applyPhao(t, PLAY(t, 'xin', 1));
    applyPhao(applyPhao(t, DRAW), { type: 'HIDE', position: 0 });
    expect(s).toEqual(copy);
  });
});

describe('Pháo Tết bots', () => {
  const bots = (count: number, level: 'easy' | 'normal' | 'hard') => PEOPLE.slice(0, count).map((p) => ({ ...p, bot: level }));
  const asBots = (s: PhaoState, level: 'easy' | 'normal' | 'hard' = 'normal'): PhaoState => ({ ...s, players: s.players.map((p) => ({ ...p, bot: level })) });

  it('only move for bots', () => {
    expect(phaoBotAction(createPhao({ players: PEOPLE, seed: 3 }))).toBeNull();
  });

  it('take cards first, get out of drawing a firecracker they saw, and draw a card they know is safe', () => {
    const steal = asBots(withHands('ne, phao', 'xin, ne', 'cuDo, nhut'));
    expect(phaoBotAction(steal)).toEqual({ type: 'PLAY', card: card(steal, 0, 'xin'), target: 1 });
    const sawIt = asBots({ ...withHands('ne, nhut, phao', 'ne, xo', 'cuDo'), peek: null });
    const seen = { ...sawIt, peek: { player: 0, cards: [...sawIt.deck].reverse() } };
    expect(phaoBotAction(seen)).toEqual({ type: 'PLAY', card: card(seen, 0, 'ne') });
    const safe = { ...seen, peek: { player: 0, cards: [sawIt.deck[1], sawIt.deck[2], sawIt.deck[0]] } };
    expect(phaoBotAction(safe)).toEqual(DRAW);
    // Someone else's peek tells a bot nothing.
    expect(phaoBotAction({ ...seen, peek: { ...seen.peek, player: 1 } })).not.toEqual({ type: 'PLAY', card: card(seen, 0, 'ne') });
  });

  it('look before drawing when the odds are bad, and hide a firecracker on top (hard)', () => {
    const risky = asBots(withHands('ne, phao', 'nhom, ne', 'cuDo'));
    expect(phaoBotAction(risky)).toEqual({ type: 'PLAY', card: card(risky, 0, 'nhom') });
    const hiding = applyPhao(asBots(withHands('ne, nhut, phao', 'xo', 'cuDo'), 'hard'), DRAW);
    expect(phaoBotAction(hiding)).toEqual({ type: 'HIDE', position: 0 });
  });

  it('play whole matches at every level without breaking a rule, and every game ends', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const count = 2 + (seed % 3);
        let s = createPhao({ players: bots(count, level), seed });
        for (let game = 0; game < 3; game++) {
          for (let steps = 0; s.phase.kind !== 'over'; steps++) {
            const action = phaoBotAction(s);
            expect(action).not.toBeNull();
            s = applyPhao(s, action!); // throws if a bot ever tries something the rules forbid
            expect(new Set(all(s)).size).toBe(all(s).length);
            expect(steps).toBeLessThan(1000);
          }
          expect(s.players.filter((p) => !p.out)).toHaveLength(1);
          s = applyPhao(s, { type: 'NEXT_GAME' });
        }
      }
    }
  }, 60_000);

  it('use every kind of card over many games', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      let s = createPhao({ players: bots(4, 'normal'), seed });
      while (s.phase.kind !== 'over') {
        const before = s.log.length;
        s = applyPhao(s, phaoBotAction(s)!);
        for (const e of s.log.slice(before)) {
          if (e.type === 'played') seen.add(kindOf(e.card));
          else if (['took', 'pair', 'putOut', 'exploded'].includes(e.type)) seen.add(e.type);
        }
      }
    }
    expect([...seen].sort()).toEqual(['day', 'day2', 'exploded', 'ne', 'nhom', 'pair', 'putOut', 'took', 'xin', 'xoc']);
  });
});
