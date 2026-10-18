import { describe, expect, it } from 'vitest';
import { applyAction, createGame, GameError, legalActions } from '../src/engine/game';
import type { Action, Dice, GameState } from '../src/engine/types';

// Board spots used below:
//  0 Start · 1 Vườn bưởi (brown, 600k) · 2 Khí vận · 3 Lò kẹo cu đơ (brown, 600k) · 4 Income tax (2tr)
//  5 Bến xe Hà Tĩnh (transport) · 12 Nhiệt điện Vũng Áng (utility) · 15 Cảng Vũng Áng (transport)
//  28 Thủy điện Bản Vẽ (utility) · 30 Go to Jail

const PLAYERS = [
  { name: 'Đăng', token: 'nonLa' },
  { name: 'Lan', token: 'conTrau' },
  { name: 'Minh', token: 'xeDap' },
] as const;

function newGame(playerCount = 2): GameState {
  return createGame({ players: PLAYERS.slice(0, playerCount).map((p) => ({ ...p })), seed: 42 });
}

/** Applies actions in order. */
function play(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce(applyAction, state);
}

const roll = (...dice: Dice): Action => ({ type: 'ROLL', dice });
const BUY: Action = { type: 'BUY' };
const DECLINE: Action = { type: 'DECLINE' };
const END_TURN: Action = { type: 'END_TURN' };

/** Returns a copy of the state with test-only changes applied. */
function setup(state: GameState, change: (s: GameState) => void): GameState {
  const copy = structuredClone(state);
  change(copy);
  return copy;
}

function give(s: GameState, owner: number, ...spaces: number[]): void {
  for (const space of spaces) s.ownership[space] = { owner, houses: 0, mortgaged: false };
}

describe('createGame', () => {
  it('starts everyone on Start with 15tr', () => {
    const s = newGame(3);
    expect(s.players.map((p) => [p.cash, p.position])).toEqual([
      [15_000_000, 0],
      [15_000_000, 0],
      [15_000_000, 0],
    ]);
    expect(s.current).toBe(0);
    expect(legalActions(s)).toEqual(['ROLL']);
  });

  it('needs 2 to 4 players with different tokens and names', () => {
    expect(() => createGame({ players: [{ name: 'A', token: 'nonLa' }] })).toThrow(GameError);
    const five = ['nonLa', 'conTrau', 'quaCam', 'bongDa', 'xeDap'] as const;
    expect(() => createGame({ players: five.map((token) => ({ name: 'X', token })) })).toThrow(GameError);
    expect(() =>
      createGame({ players: [{ name: 'A', token: 'nonLa' }, { name: 'B', token: 'nonLa' }] }),
    ).toThrow(GameError);
    expect(() =>
      createGame({ players: [{ name: 'A', token: 'nonLa' }, { name: '  ', token: 'xeDap' }] }),
    ).toThrow(GameError);
  });
});

describe('rolling and moving', () => {
  it('moves by the dice total', () => {
    const s = play(newGame(), roll(1, 2));
    expect(s.players[0].position).toBe(3);
    expect(s.dice).toEqual([1, 2]);
  });

  it('uses the seeded RNG when no dice are forced', () => {
    const a = play(newGame(), { type: 'ROLL' });
    const b = play(newGame(), { type: 'ROLL' });
    expect(a.dice).toEqual(b.dice);
    expect(a.rngState).not.toBe(newGame().rngState);
  });

  it('pays 2tr when passing Start', () => {
    const start = setup(newGame(), (s) => (s.players[0].position = 36));
    const s = play(start, roll(3, 4)); // 36 + 7 = 43 -> space 3
    expect(s.players[0].position).toBe(3);
    expect(s.players[0].cash).toBe(17_000_000);
  });

  it('pays 2tr when landing exactly on Start', () => {
    const start = setup(newGame(), (s) => (s.players[0].position = 38));
    const s = play(start, roll(1, 1));
    expect(s.players[0].position).toBe(0);
    expect(s.players[0].cash).toBe(17_000_000);
  });

  it('rejects impossible dice', () => {
    expect(() => play(newGame(), roll(0, 7))).toThrow(GameError);
  });
});

describe('doubles', () => {
  it('lets the player roll again, up to three times', () => {
    let s = play(newGame(), roll(1, 1)); // -> 2, card space (nothing yet)
    expect(s.current).toBe(0);
    expect(legalActions(s)).toEqual(['ROLL']);

    s = play(s, roll(2, 2), DECLINE); // -> 6, decline to buy
    expect(legalActions(s)).toEqual(['ROLL']);

    s = play(s, roll(3, 3), DECLINE); // -> 12, third doubles
    expect(s.doublesCount).toBe(3);
    expect(legalActions(s)).toEqual(['END_TURN']);
  });

  it('ends the turn normally without doubles', () => {
    const s = play(newGame(), roll(1, 1), roll(1, 2), DECLINE);
    expect(legalActions(s)).toEqual(['END_TURN']);
  });
});

describe('buying', () => {
  it('offers to buy an unowned property', () => {
    const s = play(newGame(), roll(1, 2));
    expect(s.phase).toEqual({ kind: 'awaitBuy', space: 3 });
    expect(legalActions(s)).toEqual(['BUY', 'DECLINE']);
  });

  it('buys the property for its price', () => {
    const s = play(newGame(), roll(1, 2), BUY);
    expect(s.players[0].cash).toBe(15_000_000 - 600_000);
    expect(s.ownership[3]).toEqual({ owner: 0, houses: 0, mortgaged: false });
    expect(legalActions(s)).toEqual(['END_TURN']);
  });

  it('leaves the property with the bank when declined', () => {
    const s = play(newGame(), roll(1, 2), DECLINE);
    expect(s.ownership[3]).toBeUndefined();
    expect(s.players[0].cash).toBe(15_000_000);
  });

  it('cannot buy without enough cash', () => {
    const start = setup(newGame(), (s) => (s.players[0].cash = 100_000));
    const s = play(start, roll(1, 2));
    expect(legalActions(s)).toEqual(['DECLINE']);
    expect(() => play(s, BUY)).toThrow(GameError);
  });

  it('does not charge rent on your own property', () => {
    const start = setup(newGame(), (s) => give(s, 0, 3));
    const s = play(start, roll(1, 2));
    expect(s.players[0].cash).toBe(15_000_000);
    expect(legalActions(s)).toEqual(['END_TURN']);
  });
});

describe('rent', () => {
  const landOn3 = (change: (s: GameState) => void) => play(setup(newGame(), change), roll(1, 2));

  it('pays base rent to the owner', () => {
    const s = landOn3((s) => give(s, 1, 3));
    expect(s.players[0].cash).toBe(15_000_000 - 40_000);
    expect(s.players[1].cash).toBe(15_000_000 + 40_000);
  });

  it('doubles rent when the owner has the whole color group', () => {
    const s = landOn3((s) => give(s, 1, 1, 3));
    expect(s.players[1].cash).toBe(15_000_000 + 80_000);
  });

  it('uses the house rent when there are houses', () => {
    const s = landOn3((s) => {
      give(s, 1, 1, 3);
      s.ownership[3].houses = 3;
    });
    expect(s.players[1].cash).toBe(15_000_000 + 1_800_000);
  });

  it('charges nothing on a mortgaged property', () => {
    const s = landOn3((s) => {
      give(s, 1, 3);
      s.ownership[3].mortgaged = true;
    });
    expect(s.players[0].cash).toBe(15_000_000);
  });

  it('charges transport rent by how many the owner has', () => {
    const one = play(setup(newGame(), (s) => give(s, 1, 5)), roll(2, 3));
    expect(one.players[1].cash).toBe(15_000_000 + 250_000);
    const two = play(setup(newGame(), (s) => give(s, 1, 5, 15)), roll(2, 3));
    expect(two.players[1].cash).toBe(15_000_000 + 500_000);
  });

  it('charges utility rent as dice total × 40k, or × 100k with both', () => {
    const from7 = (s: GameState) => (s.players[0].position = 7);
    const one = play(
      setup(newGame(), (s) => {
        from7(s);
        give(s, 1, 12);
      }),
      roll(2, 3),
    );
    expect(one.players[1].cash).toBe(15_000_000 + 5 * 40_000);
    const both = play(
      setup(newGame(), (s) => {
        from7(s);
        give(s, 1, 12, 28);
      }),
      roll(2, 3),
    );
    expect(both.players[1].cash).toBe(15_000_000 + 5 * 100_000);
  });
});

describe('tax', () => {
  it('pays income tax to the bank', () => {
    const s = play(newGame(), roll(1, 3));
    expect(s.players[0].cash).toBe(13_000_000);
    expect(s.players[1].cash).toBe(15_000_000);
    expect(legalActions(s)).toEqual(['END_TURN']);
  });
});

describe('turns', () => {
  it('passes the turn to the next player', () => {
    const s = play(newGame(3), roll(1, 2), DECLINE, END_TURN);
    expect(s.current).toBe(1);
    expect(s.dice).toBeNull();
    expect(s.log.at(-1)).toEqual({ type: 'turnStarted', player: 1 });
  });

  it('wraps around after the last player', () => {
    const s = play(newGame(2), roll(1, 2), DECLINE, END_TURN, roll(1, 2), DECLINE, END_TURN);
    expect(s.current).toBe(0);
  });
});

describe('debt and bankruptcy', () => {
  // Player 0 lands on space 3, owned by player 1 with 4 houses (rent 3tr2).
  const expensiveRent = (playerCount: number, cash: number) =>
    play(
      setup(newGame(playerCount), (s) => {
        s.players[0].cash = cash;
        give(s, 0, 1);
        give(s, 1, 3);
        s.ownership[3].houses = 4;
      }),
      roll(1, 2),
    );

  it('waits in debt when the player cannot pay', () => {
    const s = expensiveRent(2, 50_000);
    expect(s.phase).toMatchObject({ kind: 'inDebt', debtor: 0, creditor: 1, amount: 3_200_000 });
    expect(legalActions(s)).toEqual(['DECLARE_BANKRUPTCY']);
    expect(() => play(s, { type: 'PAY_DEBT' })).toThrow(GameError);
  });

  it('can pay the debt once the player has enough cash', () => {
    const inDebt = expensiveRent(2, 50_000);
    const raised = setup(inDebt, (s) => (s.players[0].cash = 5_000_000)); // milestone 4: selling/mortgaging
    expect(legalActions(raised)).toEqual(['PAY_DEBT', 'DECLARE_BANKRUPTCY']);
    const s = play(raised, { type: 'PAY_DEBT' });
    expect(s.players[0].cash).toBe(1_800_000);
    expect(s.players[1].cash).toBe(15_000_000 + 3_200_000);
    expect(legalActions(s)).toEqual(['END_TURN']);
  });

  it('gives everything to the creditor player and ends a 2-player game', () => {
    const s = play(expensiveRent(2, 50_000), { type: 'DECLARE_BANKRUPTCY' });
    expect(s.players[0]).toMatchObject({ bankrupt: true, cash: 0 });
    expect(s.players[1].cash).toBe(15_000_000 + 50_000);
    expect(s.ownership[1].owner).toBe(1);
    expect(s.phase).toEqual({ kind: 'gameOver', winner: 1 });
    expect(legalActions(s)).toEqual([]);
    expect(() => play(s, { type: 'ROLL' })).toThrow(GameError);
  });

  it('returns properties to the bank when the debt is to the bank', () => {
    const start = setup(newGame(3), (s) => {
      s.players[0].cash = 100_000;
      give(s, 0, 1);
    });
    let s = play(start, roll(1, 3)); // income tax 2tr
    expect(s.phase).toMatchObject({ kind: 'inDebt', creditor: null });

    s = play(s, { type: 'DECLARE_BANKRUPTCY' });
    expect(s.ownership[1]).toBeUndefined();
    expect(s.players[1].cash).toBe(15_000_000);
    expect(s.current).toBe(1);
    expect(legalActions(s)).toEqual(['ROLL']);
  });

  it('skips bankrupt players when passing the turn', () => {
    let s = play(expensiveRent(3, 50_000), { type: 'DECLARE_BANKRUPTCY' });
    expect(s.current).toBe(1);
    s = play(s, roll(1, 2), END_TURN); // player 1 lands on own property
    expect(s.current).toBe(2);
    s = play(s, roll(1, 2), END_TURN); // player 2 pays rent to player 1
    expect(s.players[2].cash).toBe(15_000_000 - 3_200_000);
    expect(s.current).toBe(1); // player 0 is skipped
  });
});

describe('rules engine', () => {
  it('never changes the state it is given', () => {
    const before = newGame();
    const snapshot = JSON.stringify(before);
    play(before, roll(1, 2), BUY, END_TURN);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('rejects actions that are not allowed in the current phase', () => {
    expect(() => play(newGame(), BUY)).toThrow(GameError);
    expect(() => play(newGame(), END_TURN)).toThrow(GameError);
    expect(() => play(newGame(), roll(1, 2), roll(1, 2))).toThrow(GameError);
  });

  it('can be saved and loaded as JSON', () => {
    const s = play(newGame(), roll(1, 2), BUY, END_TURN);
    const loaded: GameState = JSON.parse(JSON.stringify(s));
    const next = play(loaded, roll(1, 2)); // player 1 lands on player 0's property
    expect(next.players[1].cash).toBe(15_000_000 - 40_000);
  });
});
