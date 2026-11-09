import { describe, expect, it } from 'vitest';
import { tienLenBotAction } from '../src/games/tienlen/bot';
import { cardName, DECK_SIZE, parseCard, parseCards, type Card } from '../src/games/tienlen/cards';
import { beats, comboOf, combosIn } from '../src/games/tienlen/combos';
import {
  applyTienLen,
  canPass,
  createTienLen,
  instantWin,
  legalPlays,
  TienLenError,
  type NewTienLenPlayer,
  type TienLenAction,
  type TienLenState,
} from '../src/games/tienlen/game';

const combo = (text: string) => {
  const c = comboOf(parseCards(text));
  if (!c) throw new Error(`not a combo: ${text}`);
  return c;
};

const PEOPLE: NewTienLenPlayer[] = [
  { name: 'Đăng', token: 'nonLa', color: 'red' },
  { name: 'Lan', token: 'conTrau', color: 'indigo' },
  { name: 'Minh', token: 'quaCam', color: 'green' },
  { name: 'Hoa', token: 'xeDap', color: 'purple' },
];

/** A game with these hands (the rest of each player's state as dealt), Đăng to lead. */
function withHands(...hands: string[]): TienLenState {
  const s = createTienLen({ players: PEOPLE.slice(0, hands.length), seed: 1 });
  return {
    ...s,
    phase: 'playing',
    current: 0,
    mustInclude: null,
    table: null,
    players: s.players.map((p, i) => ({
      ...p,
      hand: parseCards(hands[i]),
      place: null,
      passed: false,
    })),
  };
}

const PLAY = (text: string): TienLenAction => ({
  type: 'PLAY',
  cards: parseCards(text),
});
const PASS: TienLenAction = { type: 'PASS' };
const run = (s: TienLenState, ...actions: TienLenAction[]) => actions.reduce(applyTienLen, s);

describe('cards', () => {
  it('order by rank, 3 lowest and 2 highest, then by suit ♠ ♣ ♦ ♥', () => {
    expect(parseCard('3♠')).toBe(0);
    expect(parseCard('3♥')).toBeGreaterThan(parseCard('3♠'));
    expect(parseCard('4♠')).toBeGreaterThan(parseCard('3♥'));
    expect(parseCard('2♠')).toBeGreaterThan(parseCard('A♥'));
    expect(parseCard('2♥')).toBe(DECK_SIZE - 1);
    expect(cardName(parseCard('10♦'))).toBe('10♦');
  });
});

describe('combos', () => {
  it('knows each shape', () => {
    expect(combo('7♣').kind).toBe('single');
    expect(combo('7♣ 7♥').kind).toBe('pair');
    expect(combo('7♣ 7♥ 7♠').kind).toBe('triple');
    expect(combo('7♣ 7♥ 7♠ 7♦').kind).toBe('quad');
    expect(combo('5♠ 3♥ 4♦')).toMatchObject({
      kind: 'straight',
      size: 3,
      top: parseCard('5♠'),
    });
    expect(combo('3♠ 3♥ 4♠ 4♦ 5♣ 5♥')).toMatchObject({
      kind: 'pairRun',
      size: 3,
    });
  });

  it('refuses what is not a combo: gaps, 2s in a run, mixed ranks', () => {
    expect(comboOf(parseCards('3♠ 5♦ 6♥'))).toBeNull();
    expect(comboOf(parseCards('K♠ A♦ 2♥'))).toBeNull();
    expect(comboOf(parseCards('3♠ 4♠'))).toBeNull(); // too short for a straight
    expect(comboOf(parseCards('3♠ 3♥ 4♠ 4♦'))).toBeNull(); // two pairs aren't enough
    expect(comboOf([])).toBeNull();
  });

  it('beats the same shape when higher, with suits breaking ties', () => {
    expect(beats(combo('9♥'), combo('9♦'))).toBe(true);
    expect(beats(combo('9♦'), combo('9♥'))).toBe(false);
    expect(beats(combo('4♠ 5♠ 6♥'), combo('4♥ 5♥ 6♦'))).toBe(true);
    expect(beats(combo('4♠ 5♠ 6♠ 7♠'), combo('4♥ 5♥ 6♦'))).toBe(false); // a longer straight isn't the same shape
    expect(beats(combo('K♠ K♣'), combo('9♠'))).toBe(false);
  });

  it('bombs (chặt): 3 pairs in a row and fours beat 2s; 4 pairs in a row beat fours', () => {
    const run3 = combo('3♠ 3♥ 4♠ 4♦ 5♣ 5♥');
    const quad = combo('7♣ 7♥ 7♠ 7♦');
    const run4 = combo('8♠ 8♥ 9♠ 9♦ 10♣ 10♥ J♠ J♣');
    expect(beats(run3, combo('2♥'))).toBe(true);
    expect(beats(run3, combo('2♠ 2♥'))).toBe(false);
    expect(beats(quad, combo('2♠ 2♥'))).toBe(true);
    expect(beats(quad, run3)).toBe(true);
    expect(beats(run4, quad)).toBe(true);
    expect(beats(quad, run4)).toBe(false);
    expect(beats(run3, combo('A♥'))).toBe(false); // bombs are only for 2s and other bombs
  });

  it('lists every combo in a hand', () => {
    const all = combosIn(parseCards('3♠ 3♥ 4♠ 5♦ 5♥'));
    const kinds = all.map((c) => `${c.kind}:${c.cards.map(cardName).join(' ')}`);
    expect(kinds).toContain('pair:3♠ 3♥');
    expect(kinds).toContain('straight:3♠ 4♠ 5♦');
    expect(kinds).toContain('straight:3♠ 4♠ 5♥'); // the top card can be either 5
    expect(all.filter((c) => c.kind === 'single')).toHaveLength(5);
  });
});

describe('a game', () => {
  it('deals 13 cards each; the lowest card leads, and the first play must include it', () => {
    const s = createTienLen({ players: PEOPLE, seed: 7 });
    expect(s.players.every((p) => p.hand.length === 13)).toBe(true);
    expect(new Set(s.players.flatMap((p) => p.hand)).size).toBe(52);
    expect(s.players[s.current].hand).toContain(parseCard('3♠'));
    expect(s.mustInclude).toBe(parseCard('3♠'));
    expect(legalPlays(s).every((c) => c.cards.includes(parseCard('3♠')))).toBe(true);
    expect(canPass(s)).toBe(false);
  });

  it('with fewer players, the lowest card dealt leads (3♠ may be in the box)', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = createTienLen({ players: PEOPLE.slice(0, 2), seed });
      const lowest = Math.min(...s.players.flatMap((p) => p.hand));
      expect(s.players[s.current].hand).toContain(lowest);
    }
  });

  it('refuses plays that are not in the hand, not a combo, or too low', () => {
    const s = withHands('3♠ 9♥ K♦', '4♠ 5♥ A♣');
    expect(() => run(s, PLAY('4♠'))).toThrow(TienLenError);
    expect(() => run(s, PLAY('3♠ 9♥'))).toThrow(TienLenError);
    expect(() => run(s, PASS)).toThrow(TienLenError); // the leader must play
    expect(() => run(s, PLAY('9♥'), PLAY('5♥'))).toThrow(TienLenError);
  });

  it('passing leaves the round; when everyone else has passed, the last to play leads', () => {
    let s = withHands('3♠ 9♥ K♦', '4♠ 5♥ A♣', '6♠ 7♥ 8♣');
    s = run(s, PLAY('9♥'), PASS); // Lan passes
    expect(s.current).toBe(2);
    s = run(s, PASS); // Minh passes: back to Đăng, who leads anything
    expect(s.current).toBe(0);
    expect(s.table).toBeNull();
    expect(s.log.at(-1)).toEqual({ type: 'roundWon', player: 0 });
    expect(s.players.every((p) => !p.passed)).toBe(true);
  });

  it('a player who passed sits out the rest of the round', () => {
    let s = withHands('3♠ 6♥ K♦', '4♠ 5♥ A♣', '7♠ 8♥ 9♣');
    s = run(s, PLAY('3♠'), PASS, PLAY('7♠')); // Lan passed, Minh beat it
    expect(s.current).toBe(0); // Đăng's turn, Lan skipped
    s = run(s, PLAY('K♦'), PASS); // Minh passes; Lan already out of this round
    expect(s.table).toBeNull();
    expect(s.current).toBe(0);
  });

  it('going out gives a place; if the round is then won, the next player still in leads', () => {
    let s = withHands('A♠', '4♠ 5♥', '7♠ 8♥');
    s = run(s, PLAY('A♠'));
    expect(s.players[0].place).toBe(1);
    expect(s.current).toBe(1);
    s = run(s, PASS, PASS);
    expect(s.table).toBeNull();
    expect(s.current).toBe(1); // Đăng is out, so Lan leads
  });

  it('ends when one player is left: places, scores, and the winner leads the next game', () => {
    let s = withHands('A♠', '4♠ 5♥', '7♠');
    s = run(s, PLAY('A♠'), PASS, PASS, PLAY('4♠'), PLAY('7♠'));
    expect(s.phase).toBe('over');
    expect(s.players.map((p) => p.place)).toEqual([1, 3, 2]);
    expect(s.scores).toEqual([2, 0, 1]);
    expect(() => run(s, PASS)).toThrow(TienLenError);
    const next = run(s, { type: 'NEXT_GAME' });
    expect(next.game).toBe(s.game + 1);
    expect(next.phase === 'over' || next.current === 0).toBe(true); // Đăng won, so Đăng leads (unless a hand wins on the deal)
    expect(next.mustInclude).toBeNull();
    expect(next.scores).toEqual([2, 0, 1]);
  });

  it('never changes the state it was given', () => {
    const s = withHands('3♠ 9♥ K♦', '4♠ 5♥ A♣');
    const copy = structuredClone(s);
    run(s, PLAY('3♠'), PLAY('4♠'));
    expect(s).toEqual(copy);
  });

  it('wins on the deal with four 2s, a dragon, six pairs, or five pairs in a row', () => {
    expect(instantWin(parseCards('2♠ 2♣ 2♦ 2♥ 3♠ 5♦ 7♥ 9♠ J♦ K♥ A♠ 4♦ 6♥'))).toBe('fourTwos');
    expect(instantWin(parseCards('3♠ 4♣ 5♦ 6♥ 7♠ 8♣ 9♦ 10♥ J♠ Q♣ K♦ A♥ 2♠'))).toBe('dragon');
    expect(instantWin(parseCards('3♠ 3♣ 5♦ 5♥ 7♠ 7♣ 9♦ 9♥ J♠ J♣ K♦ K♥ 2♠'))).toBe('sixPairs');
    expect(instantWin(parseCards('3♠ 3♣ 4♦ 4♥ 5♠ 5♣ 6♦ 6♥ 7♠ 7♣ K♦ A♥ 2♠'))).toBe('fivePairRun');
    expect(instantWin(parseCards('3♠ 4♣ 5♦ 6♥ 7♠ 8♣ 9♦ 10♥ J♠ Q♣ K♦ K♥ 2♠'))).toBeNull();
  });
});

describe('bots', () => {
  const botsOnly = (count: number, level: 'easy' | 'normal' | 'hard') => PEOPLE.slice(0, count).map((p) => ({ ...p, bot: level }));

  it('only move for bots', () => {
    const s = createTienLen({ players: PEOPLE, seed: 3 });
    expect(tienLenBotAction(s)).toBeNull();
  });

  it('keep their 2s for later when leading', () => {
    const s = {
      ...withHands('5♠ 9♦ 2♥', '4♠ 5♥ A♣'),
      players: withHands('5♠ 9♦ 2♥', '4♠ 5♥ A♣').players.map((p) => ({
        ...p,
        bot: 'normal' as const,
      })),
    };
    expect(tienLenBotAction(s)).toEqual(PLAY('5♠'));
  });

  it('play whole matches at every level without breaking a rule, and every game ends', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const count = 2 + (seed % 3);
        let s = createTienLen({ players: botsOnly(count, level), seed });
        for (let game = 0; game < 3; game++) {
          let steps = 0;
          while (s.phase === 'playing') {
            const action = tienLenBotAction(s);
            expect(action).not.toBeNull();
            s = applyTienLen(s, action!); // throws if a bot ever tries something the rules forbid
            const cards: Card[] = s.players.flatMap((p) => p.hand);
            expect(new Set(cards).size).toBe(cards.length);
            expect(++steps).toBeLessThan(400);
          }
          // Everyone gets a place; after a win on the deal (tới trắng) all the others share the last one.
          const thisGame = s.log.slice(s.log.findLastIndex((e) => e.type === 'dealt'));
          const instant = thisGame.some((e) => e.type === 'instantWin');
          const expected = instant ? [1, ...Array(count - 1).fill(count)] : Array.from({ length: count }, (_, i) => i + 1);
          expect([...s.players.map((p) => p.place)].sort()).toEqual(expected.sort());
          s = applyTienLen(s, { type: 'NEXT_GAME' });
        }
      }
    }
  }, 60_000);
});
