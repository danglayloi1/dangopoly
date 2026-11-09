import { describe, expect, it } from 'vitest';
import { eightsBotAction } from '../src/games/eights/bot';
import {
  applyEights,
  canDraw,
  canPass,
  cardPoints,
  createEights,
  EightsError,
  NOTHING_DRAWN,
  playableCards,
  type EightsAction,
  type EightsState,
  type NewEightsPlayer,
} from '../src/games/eights/game';
import { DECK_SIZE, parseCard, parseCards, suitOf } from '../src/games/tienlen/cards';

const PEOPLE: NewEightsPlayer[] = [
  { name: 'Đăng', token: 'nonLa', color: 'red' },
  { name: 'Lan', token: 'conTrau', color: 'indigo' },
  { name: 'Minh', token: 'quaCam', color: 'green' },
  { name: 'Hoa', token: 'xeDap', color: 'purple' },
];

/** A game with these hands and this card on top of the pile (the deck: what's left), Đăng to play. */
function withHands(top: string, deck: string, ...hands: string[]): EightsState {
  const s = createEights({ players: PEOPLE.slice(0, hands.length), seed: 1 });
  const pile = [parseCard(top)];
  return {
    ...s,
    players: s.players.map((p, i) => ({ ...p, hand: parseCards(hands[i]) })),
    pile,
    deck: deck ? parseCards(deck) : [],
    suit: suitOf(pile[0]),
    current: 0,
    direction: 1,
    draw: 0,
    drawn: null,
    phase: 'playing',
  };
}

const PLAY = (card: string, suit?: number): EightsAction => ({ type: 'PLAY', card: parseCard(card), ...(suit === undefined ? {} : { suit }) });
const DRAW: EightsAction = { type: 'DRAW' };
const PASS: EightsAction = { type: 'PASS' };
const run = (s: EightsState, ...actions: EightsAction[]) => actions.reduce(applyEights, s);

describe('Crazy Eights', () => {
  it('deals 7 cards each to two players, 5 to more, and turns up a card that is not an 8', () => {
    for (const count of [2, 3, 4]) {
      for (let seed = 1; seed < 20; seed++) {
        const s = createEights({ players: PEOPLE.slice(0, count), seed });
        expect(s.players.every((p) => p.hand.length === (count === 2 ? 7 : 5))).toBe(true);
        expect(s.pile).toHaveLength(1);
        expect(s.pile[0] === parseCard('8♠') || !['8♠', '8♣', '8♦', '8♥'].map(parseCard).includes(s.pile[0])).toBe(true);
        expect(new Set([...s.deck, ...s.pile, ...s.players.flatMap((p) => p.hand)]).size).toBe(DECK_SIZE);
      }
    }
  });

  it('plays a card of the same suit or rank, or an 8 that names the next suit', () => {
    const s = withHands('5♥', '3♠ 4♠', 'K♥ 5♣ 8♠ 9♦', 'J♠ Q♠ 3♣');
    expect(playableCards(s).map(String).sort()).toEqual([parseCard('K♥'), parseCard('5♣'), parseCard('8♠')].map(String).sort());
    expect(() => run(s, PLAY('9♦'))).toThrow(EightsError);
    expect(() => run(s, PLAY('8♠'))).toThrow(EightsError); // an 8 must name a suit
    const after = run(s, PLAY('8♠', 0));
    expect(after.suit).toBe(0);
    expect(after.current).toBe(1);
    expect(playableCards(after)).toEqual(parseCards('J♠ Q♠'));
  });

  it('a 2 makes the next player draw two, unless they add a 2; then the next draws four', () => {
    let s = withHands('5♥', '3♠ 4♠ 5♠ 6♠ 7♠ 9♠', '2♥ K♣', '2♣ K♦', 'Q♣ 3♦');
    s = run(s, PLAY('2♥'));
    expect(s.draw).toBe(2);
    expect(playableCards(s)).toEqual([parseCard('2♣')]); // only a 2 answers a 2
    s = run(s, PLAY('2♣'));
    expect(s.draw).toBe(4);
    expect(s.current).toBe(2);
    s = run(s, DRAW);
    expect(s.players[2].hand).toHaveLength(6);
    expect(s.draw).toBe(0);
    expect(s.current).toBe(0); // drawing them ends Minh's turn
  });

  it('a queen skips the next player; an ace turns the direction around', () => {
    let s = withHands('5♥', '3♠ 4♠', 'Q♥ A♥ K♣', '7♥ 9♣', '6♥ 9♦');
    s = run(s, PLAY('Q♥'));
    expect(s.current).toBe(2); // Lan skipped
    s = run(s, PLAY('6♥'));
    expect(s.current).toBe(0);
    s = run(s, PLAY('A♥'));
    expect(s.direction).toBe(-1);
    expect(s.current).toBe(2); // the other way round now
  });

  it('with two players, an ace or a queen means playing again', () => {
    const s = withHands('5♥', '3♠ 4♠', 'A♥ Q♥ K♣', '9♣ 9♦');
    expect(run(s, PLAY('A♥')).current).toBe(0);
    expect(run(s, PLAY('Q♥')).current).toBe(0);
  });

  it('drawing: a card that fits may be played at once (or passed); one that does not ends the turn', () => {
    const fits = withHands('5♥', '3♠ 9♥', '4♣ K♣', '7♣ 9♣');
    let s = run(fits, DRAW);
    expect(s.drawn).toBe(parseCard('9♥'));
    expect(s.current).toBe(0);
    expect(canDraw(s)).toBe(false);
    expect(playableCards(s)).toEqual([parseCard('9♥')]);
    expect(() => run(s, PLAY('4♣'))).toThrow(EightsError);
    expect(run(s, PASS).current).toBe(1);
    expect(run(s, PLAY('9♥')).pile.at(-1)).toBe(parseCard('9♥'));

    s = run(withHands('5♥', '9♠ 3♠', '4♣ K♣', '7♣ 9♣'), DRAW);
    expect(s.current).toBe(1); // a 3♠ doesn't fit
    expect(() => run(fits, PASS)).toThrow(EightsError); // passing without drawing first
  });

  it('when the deck runs out, the pile (all but its top) is shuffled back in', () => {
    const s = { ...withHands('5♥', '', '4♣ K♣', '7♣ 9♣'), pile: parseCards('3♦ 6♠ 5♥') };
    const after = run(s, DRAW);
    expect(after.log.some((e) => e.type === 'reshuffled')).toBe(true);
    expect(after.pile).toEqual([parseCard('5♥')]);
    expect(after.deck.length + after.players[0].hand.length).toBe(2 + 2); // the hand, plus the two cards under the top
    // Nothing at all to draw: only passing is left.
    const empty = run(withHands('5♥', '', '4♣ K♣', '7♣ 9♣'), DRAW);
    expect(empty.drawn).toBe(NOTHING_DRAWN);
    expect(canPass(empty)).toBe(true);
    expect(playableCards(empty)).toEqual([]);
  });

  it('going out wins the game and scores everyone else’s cards', () => {
    const s = run(withHands('5♥', '3♠', 'K♥', '8♣ Q♦ 7♠', 'A♣ 2♦'), PLAY('K♥'));
    expect(s.phase).toBe('over');
    expect(s.log.at(-1)).toEqual({ type: 'won', player: 0, points: 50 + 10 + 7 + 1 + 2 });
    expect(s.scores).toEqual([70, 0, 0]);
    expect(cardPoints(parseCard('10♠'))).toBe(10);
    expect(cardPoints(parseCard('3♠'))).toBe(3);
    const next = run(s, { type: 'NEXT_GAME' });
    expect(next.game).toBe(s.game + 1);
    expect(next.current).toBe(0); // the winner starts
    expect(next.scores).toEqual([70, 0, 0]);
  });

  it('never changes the state it was given', () => {
    const s = withHands('5♥', '3♠ 4♠', 'K♥ 5♣', 'J♠ Q♠');
    const copy = structuredClone(s);
    run(s, PLAY('K♥'), DRAW);
    expect(s).toEqual(copy);
  });
});

describe('Crazy Eights bots', () => {
  const bots = (count: number, level: 'easy' | 'normal' | 'hard') => PEOPLE.slice(0, count).map((p) => ({ ...p, bot: level }));

  it('only move for bots', () => {
    expect(eightsBotAction(createEights({ players: PEOPLE, seed: 3 }))).toBeNull();
  });

  it('keep their 8s while another card fits, and name the suit they hold most of', () => {
    const s = withHands('5♥', '3♠', '8♣ 9♥ 2♠', 'K♣ Q♣');
    const bot = { ...s, players: s.players.map((p) => ({ ...p, bot: 'normal' as const })) };
    expect(eightsBotAction(bot)).toEqual(PLAY('9♥'));
    const onlyEight = { ...bot, players: bot.players.map((p, i) => (i === 0 ? { ...p, hand: parseCards('8♣ 3♠ 4♠ 6♦') } : p)) };
    expect(eightsBotAction(onlyEight)).toEqual(PLAY('8♣', 0)); // ♠ is what it has most of
  });

  it('play whole matches at every level without breaking a rule, and every game ends', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const count = 2 + (seed % 3);
        let s = createEights({ players: bots(count, level), seed });
        for (let game = 0; game < 3; game++) {
          for (let steps = 0; s.phase === 'playing'; steps++) {
            const action = eightsBotAction(s);
            expect(action).not.toBeNull();
            s = applyEights(s, action!); // throws if a bot ever tries something the rules forbid
            expect(new Set([...s.deck, ...s.pile, ...s.players.flatMap((p) => p.hand)]).size).toBe(DECK_SIZE);
            expect(steps).toBeLessThan(2000);
          }
          s = applyEights(s, { type: 'NEXT_GAME' });
        }
      }
    }
  }, 60_000);
});
