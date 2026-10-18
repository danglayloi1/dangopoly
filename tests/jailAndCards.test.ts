import { describe, expect, it } from 'vitest';
import { CARDS, type CardDeck, type CardEffect } from '../src/data/cards';
import { applyAction, createGame, legalActions } from '../src/engine/game';
import type { Action, Dice, GameState } from '../src/engine/types';

// Board spots used below:
//  Chance (Cơ hội): 7, 22, 36 · Community Chest (Khí vận): 2, 17, 33
//  4 income tax (2tr) · 5/15/25/35 transport · 10 jail · 12/28 utilities · 30 go to jail

function newGame(players = 2): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' as const },
      { name: 'Lan', token: 'conTrau' as const },
      { name: 'Minh', token: 'xeDap' as const },
    ].slice(0, players),
    seed: 11,
  });
}

function setup(change: (s: GameState) => void, base = newGame()): GameState {
  const s = structuredClone(base);
  change(s);
  return s;
}

const play = (state: GameState, ...actions: Action[]) => actions.reduce(applyAction, state);
const roll = (...dice: Dice): Action => ({ type: 'ROLL', dice });
const END_TURN: Action = { type: 'END_TURN' };

/** Index of the first card in a deck matching the effect. */
function cardWhere(deck: CardDeck, match: (e: CardEffect) => boolean): number {
  const index = CARDS[deck].findIndex((c) => match(c.effect));
  if (index < 0) throw new Error('no such card');
  return index;
}

/** Puts that card on top of its deck. */
function stack(s: GameState, deck: CardDeck, card: number): void {
  s.decks[deck] = [card, ...s.decks[deck].filter((c) => c !== card)];
}

/** Player 0 in jail, at the start of their turn. */
const jailed = (change: (s: GameState) => void = () => {}) =>
  setup((s) => {
    s.players[0].position = 10;
    s.players[0].inJail = true;
    change(s);
  });

describe('going to jail', () => {
  it('from the Go to Jail corner, without passing Start', () => {
    const start = setup((s) => (s.players[0].position = 27));
    const s = play(start, roll(1, 2)); // 27 + 3 = 30
    expect(s.players[0]).toMatchObject({ position: 10, inJail: true, cash: 15_000_000 });
    expect(legalActions(s)).toEqual(['END_TURN']);
  });

  it('ends the turn even after doubles', () => {
    const start = setup((s) => (s.players[0].position = 28));
    const s = play(start, roll(1, 1)); // 28 + 2 = 30
    expect(legalActions(s)).toEqual(['END_TURN']);
  });
});

describe('in jail', () => {
  it('offers rolling for doubles or paying 500k', () => {
    expect(legalActions(jailed())).toEqual(['ROLL', 'PAY_JAIL_FINE']);
  });

  it('offers the card when the player has one', () => {
    expect(legalActions(jailed((s) => (s.players[0].jailCards = ['chance'])))).toEqual([
      'ROLL',
      'PAY_JAIL_FINE',
      'USE_JAIL_CARD',
    ]);
  });

  it("doesn't offer paying without enough cash", () => {
    expect(legalActions(jailed((s) => (s.players[0].cash = 499_999)))).toEqual(['ROLL']);
  });

  it('stays in jail without doubles', () => {
    const s = play(jailed(), roll(1, 2));
    expect(s.players[0]).toMatchObject({ position: 10, inJail: true, jailAttempts: 1 });
    expect(legalActions(s)).toEqual(['END_TURN']);
  });

  it('gets out with doubles and moves, but no extra roll', () => {
    const s = play(jailed(), roll(3, 3)); // 10 + 6 = 16, unowned
    expect(s.players[0]).toMatchObject({ position: 16, inJail: false });
    expect(legalActions(s)).toEqual(['BUY', 'DECLINE']);
    expect(legalActions(play(s, { type: 'DECLINE' }))).toEqual(['END_TURN']);
  });

  it('can pay 500k, then rolls as usual', () => {
    let s = play(jailed(), { type: 'PAY_JAIL_FINE' });
    expect(s.players[0]).toMatchObject({ inJail: false, cash: 14_500_000 });
    expect(legalActions(s)).toEqual(['ROLL']);
    s = play(s, roll(1, 3)); // 14
    expect(s.players[0].position).toBe(14);
  });

  it('can use a jail card, which goes back under its deck', () => {
    const card = cardWhere('chance', (e) => e.kind === 'jailFree');
    const start = jailed((s) => {
      s.players[0].jailCards = ['chance'];
      s.decks.chance = s.decks.chance.filter((c) => c !== card);
    });
    const s = play(start, { type: 'USE_JAIL_CARD' });
    expect(s.players[0]).toMatchObject({ inJail: false, jailCards: [] });
    expect(s.decks.chance.at(-1)).toBe(card);
    expect(s.decks.chance).toHaveLength(16);
  });

  it('must pay 500k after the third failed roll, then moves', () => {
    const s = play(jailed((d) => (d.players[0].jailAttempts = 2)), roll(1, 3)); // 10 + 4 = 14
    expect(s.players[0]).toMatchObject({ inJail: false, cash: 14_500_000, position: 14 });
    expect(s.log.map((e) => e.type)).toContain('leftJail');
  });

  it('can raise the forced fine like any debt', () => {
    const inDebt = play(
      jailed((d) => {
        d.players[0].jailAttempts = 2;
        d.players[0].cash = 100_000;
      }),
      roll(1, 3),
    );
    expect(inDebt.phase).toMatchObject({ kind: 'inDebt', amount: 500_000, reason: { kind: 'jailFine' } });
    const raised = setup((d) => (d.players[0].cash = 600_000), inDebt);
    const s = play(raised, { type: 'PAY_DEBT' });
    expect(s.players[0]).toMatchObject({ inJail: false, cash: 100_000, position: 14 });
  });

  it('still collects rent while in jail', () => {
    const start = setup((s) => {
      s.players[0].position = 10;
      s.players[0].inJail = true;
      s.ownership[3] = { owner: 0, houses: 0, mortgaged: false };
      s.current = 1;
    });
    const s = play(start, roll(1, 2)); // Lan lands on Đăng's Lò kẹo cu đơ
    expect(s.players[0].cash).toBe(15_000_000 + 40_000);
  });
});

describe('decks', () => {
  it('holds 16 cards each, shuffled the same way for the same seed', () => {
    const a = newGame();
    expect([...a.decks.chance].sort((x, y) => x - y)).toEqual([...Array(16).keys()]);
    expect([...a.decks.community].sort((x, y) => x - y)).toEqual([...Array(16).keys()]);
    expect(newGame().decks).toEqual(a.decks);
    expect(a.decks.chance).not.toEqual([...Array(16).keys()]);
  });

  it('puts a drawn card back under the deck', () => {
    const card = cardWhere('community', (e) => e.kind === 'collect');
    const s = play(setup((d) => stack(d, 'community', card)), roll(1, 1)); // 2: Khí vận
    expect(s.decks.community.at(-1)).toBe(card);
    expect(s.lastCard).toEqual({ deck: 'community', card });
  });

  it('forgets the drawn card when the next turn starts', () => {
    const card = cardWhere('community', (e) => e.kind === 'collect');
    const s = play(setup((d) => stack(d, 'community', card)), roll(1, 1), roll(1, 2), { type: 'DECLINE' }, END_TURN);
    expect(s.lastCard).toBeNull();
  });
});

describe('card effects', () => {
  /** Player 0 on `from`, `card` on top of its deck, then rolls `dice` to land on the card space. */
  const drawAt = (deck: CardDeck, match: (e: CardEffect) => boolean, from: number, dice: Dice, change = (_: GameState) => {}) =>
    play(
      setup((s) => {
        stack(s, deck, cardWhere(deck, match));
        s.players[0].position = from;
        change(s);
      }),
      roll(...dice),
    );

  it('collect: the bank pays', () => {
    const s = drawAt('community', (e) => e.kind === 'collect' && e.amount === 2_000_000, 0, [1, 1]);
    expect(s.players[0].cash).toBe(17_000_000);
  });

  it('pay: you pay the bank, or go into debt', () => {
    const paid = drawAt('community', (e) => e.kind === 'pay' && e.amount === 1_000_000, 0, [1, 1]);
    expect(paid.players[0].cash).toBe(14_000_000);
    const poor = drawAt('community', (e) => e.kind === 'pay' && e.amount === 1_000_000, 0, [1, 1], (s) => (s.players[0].cash = 10_000));
    expect(poor.phase).toMatchObject({ kind: 'inDebt', amount: 1_000_000, creditor: null });
  });

  it('advance to Start: collects 2tr', () => {
    const s = drawAt('chance', (e) => e.kind === 'advanceTo' && e.space === 0, 3, [2, 2]); // 7
    expect(s.players[0]).toMatchObject({ position: 0, cash: 17_000_000 });
  });

  it('advance to a space: collects 2tr only when passing Start', () => {
    const ahead = drawAt('chance', (e) => e.kind === 'advanceTo' && e.space === 39, 32, [2, 2]); // 36 -> 39
    expect(ahead.players[0]).toMatchObject({ position: 39, cash: 15_000_000 });
    expect(legalActions(ahead)).toEqual(['BUY', 'DECLINE']);
    const around = drawAt('chance', (e) => e.kind === 'advanceTo' && e.space === 29, 32, [2, 2]); // 36 -> 29
    expect(around.players[0]).toMatchObject({ position: 29, cash: 17_000_000 });
  });

  it('nearest transport: double rent to the owner', () => {
    const s = drawAt('chance', (e) => e.kind === 'advanceToNearest' && e.target === 'transport', 3, [2, 2], (d) => {
      d.ownership[15] = { owner: 1, houses: 0, mortgaged: false };
    }); // 7 -> 15
    expect(s.players[0].position).toBe(15);
    expect(s.players[1].cash).toBe(15_000_000 + 500_000);
  });

  it('nearest transport wraps past Start', () => {
    const s = drawAt('chance', (e) => e.kind === 'advanceToNearest' && e.target === 'transport', 32, [2, 2]); // 36 -> 5
    expect(s.players[0]).toMatchObject({ position: 5, cash: 17_000_000 });
  });

  it('nearest utility: dice total × 100k to the owner', () => {
    const s = drawAt('chance', (e) => e.kind === 'advanceToNearest' && e.target === 'utility', 3, [2, 2], (d) => {
      d.ownership[12] = { owner: 1, houses: 0, mortgaged: false };
    }); // 7 -> 12, dice total 4
    expect(s.players[1].cash).toBe(15_000_000 + 400_000);
  });

  it('go back 3 spaces, and act on the new space', () => {
    const s = drawAt('chance', (e) => e.kind === 'moveBack', 3, [2, 2]); // 7 -> 4: income tax
    expect(s.players[0]).toMatchObject({ position: 4, cash: 13_000_000 });
  });

  it('go to jail', () => {
    const s = drawAt('community', (e) => e.kind === 'goToJail', 0, [1, 1]);
    expect(s.players[0]).toMatchObject({ position: 10, inJail: true });
    expect(legalActions(s)).toEqual(['END_TURN']);
  });

  it('jail card: kept by the player and out of the deck', () => {
    const s = drawAt('chance', (e) => e.kind === 'jailFree', 3, [1, 3]); // 7
    expect(s.players[0].jailCards).toEqual(['chance']);
    expect(s.decks.chance).toHaveLength(15);
  });

  it('repairs: pay per house and per hotel', () => {
    const s = drawAt('chance', (e) => e.kind === 'repairs', 3, [1, 3], (d) => {
      d.ownership[1] = { owner: 0, houses: 2, mortgaged: false };
      d.ownership[3] = { owner: 0, houses: 5, mortgaged: false };
    });
    expect(s.players[0].cash).toBe(15_000_000 - (2 * 250_000 + 1_000_000));
  });

  it('pay each player', () => {
    const s = play(
      setup((d) => {
        stack(d, 'chance', cardWhere('chance', (e) => e.kind === 'payEach'));
        d.players[0].position = 3;
      }, newGame(3)),
      roll(1, 3),
    );
    expect(s.players.map((p) => p.cash)).toEqual([14_000_000, 15_500_000, 15_500_000]);
  });

  it('collect from each player; a player short of cash gives what they have', () => {
    const s = play(
      setup((d) => {
        stack(d, 'community', cardWhere('community', (e) => e.kind === 'collectFromEach'));
        d.players[2].cash = 30_000;
      }, newGame(3)),
      roll(1, 1),
    );
    expect(s.players.map((p) => p.cash)).toEqual([15_130_000, 14_900_000, 0]);
  });
});

describe('jail cards in trades and bankruptcy', () => {
  it('can be traded', () => {
    const start = setup((s) => (s.players[0].jailCards = ['community']));
    const offer = {
      from: 0,
      to: 1,
      give: { spaces: [], cash: 0, jailCards: 1 },
      take: { spaces: [], cash: 300_000, jailCards: 0 },
    };
    const s = play(start, { type: 'PROPOSE_TRADE', offer }, { type: 'ACCEPT_TRADE' });
    expect(s.players[0].jailCards).toEqual([]);
    expect(s.players[1].jailCards).toEqual(['community']);
  });

  it('go back to their deck when the holder goes bankrupt to the bank', () => {
    const card = cardWhere('community', (e) => e.kind === 'jailFree');
    const start = setup((s) => {
      s.players[0].jailCards = ['community'];
      s.decks.community = s.decks.community.filter((c) => c !== card);
      s.players[0].cash = 100_000;
    });
    const s = play(start, roll(1, 3), { type: 'DECLARE_BANKRUPTCY' }); // income tax
    expect(s.decks.community).toHaveLength(16);
  });
});
