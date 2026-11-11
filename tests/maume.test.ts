import { describe, expect, it } from 'vitest';
import { mauMeBotAction } from '../src/games/maume/bot';
import {
  byColor,
  cardPoints,
  colorOf,
  DECK_SIZE,
  FACE_DRAW2,
  FACE_REVERSE,
  FACE_SKIP,
  FACE_WILD,
  FACE_WILD4,
  faceOf,
  isWild,
  makeCard,
  parseCard,
  parseCards,
} from '../src/games/maume/cards';
import {
  applyMauMe,
  canDraw,
  canPass,
  createMauMe,
  HAND_SIZE,
  MauMeError,
  NOTHING_DRAWN,
  playableCards,
  type MauMeAction,
  type MauMeState,
  type NewMauMePlayer,
} from '../src/games/maume/game';
import { cardName, MAUME_TEXT } from '../src/games/maume/text';

const PEOPLE: NewMauMePlayer[] = [
  { name: 'Đăng', token: 'nonLa', color: 'red' },
  { name: 'Lan', token: 'conTrau', color: 'indigo' },
  { name: 'Minh', token: 'quaCam', color: 'green' },
  { name: 'Hoa', token: 'xeDap', color: 'purple' },
];

/**
 * A game with this card on top of the pile, this deck (drawn from the end) and these hands, Đăng to
 * play. All the cards are read in one go, so two of the same card are told apart.
 */
function withHands(top: string, deck: string, ...hands: string[]): MauMeState {
  const s = createMauMe({ players: PEOPLE.slice(0, hands.length), seed: 1 });
  const groups = [top, deck, ...hands].map((g) => g.split(',').filter((w) => w.trim()).length);
  const all = parseCards([top, deck, ...hands].filter(Boolean).join(', '));
  const cut: number[][] = [];
  let at = 0;
  for (const n of groups) cut.push(all.slice(at, (at += n)));
  const [pile, rest, ...dealt] = cut;
  return {
    ...s,
    players: s.players.map((p, i) => ({ ...p, hand: dealt[i] })),
    pile,
    deck: rest,
    color: colorOf(pile[0]),
    current: 0,
    direction: 1,
    draw: 0,
    drawn: null,
    phase: 'playing',
  };
}

const PLAY = (card: string, color?: number): MauMeAction => ({ type: 'PLAY', card: parseCard(card), ...(color === undefined ? {} : { color }) });
const DRAW: MauMeAction = { type: 'DRAW' };
const PASS: MauMeAction = { type: 'PASS' };
const run = (s: MauMeState, ...actions: MauMeAction[]) => actions.reduce(applyMauMe, s);
const all = (s: MauMeState) => [...s.deck, ...s.pile, ...s.players.flatMap((p) => p.hand)];

describe('Màu Mè cards', () => {
  it('has 104 different cards: per color two of each number 1–9 and two of each action, then 4 wild and 4 +4', () => {
    const cards = Array.from({ length: DECK_SIZE }, (_, i) => i);
    for (let color = 0; color < 4; color++) {
      const mine = cards.filter((c) => colorOf(c) === color);
      expect(mine).toHaveLength(24);
      for (let face = 1; face <= FACE_DRAW2; face++) expect(mine.filter((c) => faceOf(c) === face)).toHaveLength(2);
    }
    expect(cards.filter((c) => faceOf(c) === FACE_WILD)).toHaveLength(4);
    expect(cards.filter((c) => faceOf(c) === FACE_WILD4)).toHaveLength(4);
    expect(cards.filter(isWild)).toHaveLength(8);
    // makeCard and faceOf/colorOf agree.
    for (const c of cards) {
      const copy = isWild(c) ? (c - 96) % 4 : (c % 24) % 2;
      expect(makeCard(Math.max(colorOf(c), 0), faceOf(c), copy)).toBe(c);
    }
  });

  it('scores numbers as printed, actions 20 and wild cards 50; reads and names cards', () => {
    expect(cardPoints(parseCard('son 7'))).toBe(7);
    expect(cardPoints(parseCard('la skip'))).toBe(20);
    expect(cardPoints(parseCard('+4'))).toBe(50);
    expect(parseCards('son 7, son 7')).toEqual([makeCard(0, 7, 0), makeCard(0, 7, 1)]);
    expect(() => parseCards('son 7, son 7, son 7')).toThrow();
    expect(cardName(MAUME_TEXT.vi, parseCard('cham +2'))).toBe('Chàm +2');
    expect(cardName(MAUME_TEXT.en, parseCard('wild'))).toBe('Wild');
    expect(parseCards('wild, nghe 3, son reverse').sort(byColor)).toEqual(parseCards('son reverse, nghe 3, wild'));
  });
});

describe('Màu Mè', () => {
  it('deals 7 cards each and turns up a number card', () => {
    for (const count of [2, 3, 4]) {
      for (let seed = 1; seed < 30; seed++) {
        const s = createMauMe({ players: PEOPLE.slice(0, count), seed });
        expect(s.players.every((p) => p.hand.length === HAND_SIZE)).toBe(true);
        expect(s.pile).toHaveLength(1);
        expect(faceOf(s.pile[0])).toBeLessThanOrEqual(9);
        expect(s.color).toBe(colorOf(s.pile[0]));
        expect(new Set(all(s)).size).toBe(DECK_SIZE);
      }
    }
  });

  it('plays a card of the same color or face, or a wild card that names the next color', () => {
    const s = withHands('son 5', 'nghe 1', 'son 9, nghe 5, la 3, wild', 'cham 2, cham 3');
    expect(playableCards(s).sort(byColor)).toEqual(parseCards('son 9, nghe 5, wild'));
    expect(() => applyMauMe(s, PLAY('la 3'))).toThrow(MauMeError);
    expect(() => applyMauMe(s, PLAY('wild'))).toThrow(MauMeError); // must name a color
    const after = applyMauMe(s, PLAY('wild', 3));
    expect(after.color).toBe(3);
    expect(after.current).toBe(1);
    expect(after.log.at(-1)).toMatchObject({ type: 'played', color: 3 });
    expect(playableCards(after).sort(byColor)).toEqual(parseCards('cham 2, cham 3'));
  });

  it('action cards match each other by face across colors', () => {
    const s = withHands('son skip', '', 'la skip, la 3', 'cham 2, cham 3');
    expect(playableCards(s)).toEqual([parseCard('la skip')]);
  });

  it('Chặn skips the next player; Quay turns the direction around', () => {
    const s = withHands('son 5', 'nghe 1, nghe 2', 'son skip, son reverse, la 1', 'cham 2, cham 3', 'la 4, la 5', 'nghe 6, nghe 7');
    const skipped = applyMauMe(s, PLAY('son skip'));
    expect(skipped.current).toBe(2);
    expect(skipped.log.at(-1)).toEqual({ type: 'skipped', player: 1 });
    const reversed = applyMauMe(s, PLAY('son reverse'));
    expect(reversed.direction).toBe(-1);
    expect(reversed.current).toBe(3);
  });

  it('with two players, Quay or Chặn means playing again', () => {
    const s = withHands('son 5', 'nghe 1', 'son reverse, son skip, la 1', 'cham 2, cham 3');
    expect(applyMauMe(s, PLAY('son reverse')).current).toBe(0);
    expect(applyMauMe(s, PLAY('son skip')).current).toBe(0);
  });

  it('+2 and +4 add up: +2 or +4 on a +2, only +4 on a +4; the one who cannot draws the lot', () => {
    const s = withHands('son 5', 'nghe 1, nghe 2, nghe 3, nghe 4, nghe 5, nghe 6, nghe 7, nghe 8', 'son +2, la 1', 'la +2, +4, cham 3', 'cham +2, la 4');
    const one = applyMauMe(s, PLAY('son +2'));
    expect(one.draw).toBe(2);
    expect(playableCards(one).sort(byColor)).toEqual(parseCards('la +2, +4'));
    const two = applyMauMe(one, PLAY('+4', 2));
    expect(two.draw).toBe(6);
    expect(playableCards(two)).toEqual([]); // Minh's +2 can't go on a +4
    const drawn = applyMauMe(two, DRAW);
    expect(drawn.players[2].hand).toHaveLength(8);
    expect(drawn.log.at(-1)).toMatchObject({ type: 'drew', player: 2, count: 6, forced: true });
    expect(drawn.draw).toBe(0);
    expect(drawn.current).toBe(0);
    expect(new Set(all(drawn)).size).toBe(all(drawn).length);
  });

  it('drawing: a card that fits may be played at once (or passed); one that does not ends the turn', () => {
    const fits = applyMauMe(withHands('son 5', 'nghe 2, son 8', 'la 1, cham 1', 'cham 2, cham 3'), DRAW);
    expect(fits.drawn).toBe(parseCard('son 8'));
    expect(fits.current).toBe(0);
    expect(canDraw(fits)).toBe(false);
    expect(canPass(fits)).toBe(true);
    expect(playableCards(fits)).toEqual([parseCard('son 8')]);
    expect(applyMauMe(fits, PASS).current).toBe(1);
    expect(applyMauMe(fits, PLAY('son 8')).current).toBe(1);

    const misses = applyMauMe(withHands('son 5', 'son 8, nghe 2', 'la 1, cham 1', 'cham 2, cham 3'), DRAW);
    expect(misses.drawn).toBeNull();
    expect(misses.current).toBe(1);
    expect(() => applyMauMe(withHands('son 5', 'nghe 2', 'la 1', 'cham 2'), PASS)).toThrow(MauMeError);
  });

  it('when the deck runs out, the pile (all but its top) is shuffled back in; with nothing left, pass', () => {
    const s = { ...withHands('son 5', '', 'la 1, cham 1', 'cham 2, cham 3'), pile: parseCards('nghe 1, nghe 2, son 5') };
    const drew = applyMauMe(s, DRAW);
    expect(drew.log.some((e) => e.type === 'reshuffled')).toBe(true);
    expect(drew.pile).toEqual([parseCard('son 5')]);
    const empty = applyMauMe(withHands('son 5', '', 'la 1', 'cham 2'), DRAW);
    expect(empty.drawn).toBe(NOTHING_DRAWN);
    expect(playableCards(empty)).toEqual([]);
    expect(applyMauMe(empty, PASS).current).toBe(1);
  });

  it('calls "Báo!" at one card; going out wins and scores everyone else’s cards', () => {
    const s = withHands('son 5', 'nghe 1', 'son 7, son 9, la 2', 'cham 2, +4', 'nghe skip, la 3');
    expect(run(s, PLAY('son 7')).log.some((e) => e.type === 'lastCard')).toBe(false);
    const two = withHands('son 5', 'nghe 1', 'son 7, son 9', 'cham 2, +4', 'nghe skip, la 3');
    expect(run(two, PLAY('son 7')).log.at(-1)).toEqual({ type: 'lastCard', player: 0 });
    const out = { ...withHands('son 5', 'nghe 1', 'son 9', 'cham 2, +4', 'nghe skip, la 3') };
    const won = applyMauMe(out, PLAY('son 9'));
    expect(won.phase).toBe('over');
    expect(won.log.at(-1)).toEqual({ type: 'won', player: 0, points: 2 + 50 + 20 + 3 });
    expect(won.scores).toEqual([75, 0, 0]);
    expect(() => applyMauMe(won, DRAW)).toThrow(MauMeError);
    const again = applyMauMe(won, { type: 'NEXT_GAME' });
    expect(again.game).toBe(2);
    expect(again.current).toBe(0);
    expect(again.scores).toEqual([75, 0, 0]);
  });

  it('never changes the state it was given', () => {
    const s = withHands('son 5', 'nghe 1, nghe 2', 'son 7, son +2', 'la 1, la 2');
    const copy = structuredClone(s);
    run(s, PLAY('son +2'), DRAW);
    expect(s).toEqual(copy);
  });
});

describe('Màu Mè bots', () => {
  const bots = (count: number, level: 'easy' | 'normal' | 'hard') => PEOPLE.slice(0, count).map((p) => ({ ...p, bot: level }));
  const asBots = (s: MauMeState): MauMeState => ({ ...s, players: s.players.map((p) => ({ ...p, bot: 'normal' as const })) });

  it('only move for bots', () => {
    expect(mauMeBotAction(createMauMe({ players: PEOPLE, seed: 3 }))).toBeNull();
  });

  it('keep wild cards while another card fits, name the color they hold most of, and pass draws on', () => {
    const bot = asBots(withHands('son 5', 'nghe 1', 'wild, son 9, cham 2', 'la 1, la 2'));
    expect(mauMeBotAction(bot)).toEqual(PLAY('son 9'));
    const onlyWild = asBots(withHands('son 5', 'nghe 1', 'wild, la 3, la 4, nghe 6', 'la 1, la 2'));
    expect(mauMeBotAction(onlyWild)).toEqual(PLAY('wild', 2)); // lá is what it has most of
    const owed = { ...asBots(withHands('son +2', 'nghe 1', '+4, cham +2, son 3', 'la 1, la 2')), draw: 2 };
    expect(mauMeBotAction(owed)).toEqual(PLAY('cham +2'));
  });

  it('hit a player about to go out with an action card', () => {
    const bot = asBots(withHands('son 5', 'nghe 1', 'son 9, son skip, la 2', 'la 1', 'la 3, la 4'));
    expect(mauMeBotAction(bot)).toEqual(PLAY('son skip'));
  });

  it('play whole matches at every level without breaking a rule, and every game ends', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const count = 2 + (seed % 3);
        let s = createMauMe({ players: bots(count, level), seed });
        for (let game = 0; game < 3; game++) {
          for (let steps = 0; s.phase === 'playing'; steps++) {
            const action = mauMeBotAction(s);
            expect(action).not.toBeNull();
            s = applyMauMe(s, action!); // throws if a bot ever tries something the rules forbid
            expect(new Set(all(s)).size).toBe(DECK_SIZE);
            expect(all(s)).toHaveLength(DECK_SIZE);
            expect(steps).toBeLessThan(3000);
          }
          s = applyMauMe(s, { type: 'NEXT_GAME' });
        }
      }
    }
  }, 60_000);

  it('use every kind of card over many games', () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 10; seed++) {
      let s = createMauMe({ players: bots(4, 'normal'), seed });
      while (s.phase === 'playing') {
        s = applyMauMe(s, mauMeBotAction(s)!);
        const last = [...s.log].reverse().find((e) => e.type === 'played');
        if (last?.type === 'played') seen.add(faceOf(last.card));
      }
    }
    for (const face of [FACE_SKIP, FACE_REVERSE, FACE_DRAW2, FACE_WILD, FACE_WILD4]) expect(seen.has(face)).toBe(true);
  });
});
