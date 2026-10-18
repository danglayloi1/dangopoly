import { describe, expect, it } from 'vitest';
import {
  canBuildHouse,
  canMortgage,
  canSellHouse,
  canUnmortgage,
  HOTEL,
  propertyActions,
} from '../src/engine/buildings';
import { applyAction, createGame, GameError, legalActions } from '../src/engine/game';
import type { Action, Dice, GameState } from '../src/engine/types';

// Board spots used below:
//  1 Vườn bưởi Phúc Trạch + 3 Lò kẹo cu đơ = brown set (600k each, house 500k)
//  6, 8, 9 = light blue set · 5 Bến xe Hà Tĩnh (transport, 2tr)

function newGame(): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
    ],
    seed: 7,
  });
}

function setup(change: (s: GameState) => void, base = newGame()): GameState {
  const s = structuredClone(base);
  change(s);
  return s;
}

function give(s: GameState, owner: number, ...spaces: number[]): void {
  for (const space of spaces) s.ownership[space] = { owner, houses: 0, mortgaged: false };
}

const play = (state: GameState, ...actions: Action[]) => actions.reduce(applyAction, state);
const build = (space: number): Action => ({ type: 'BUILD_HOUSE', space });
const sell = (space: number): Action => ({ type: 'SELL_HOUSE', space });
const mortgage = (space: number): Action => ({ type: 'MORTGAGE', space });
const unmortgage = (space: number): Action => ({ type: 'UNMORTGAGE', space });
const roll = (...dice: Dice): Action => ({ type: 'ROLL', dice });

/** Player 0 owns the whole brown set, on their own turn. */
const brownSet = () => setup((s) => give(s, 0, 1, 3));

describe('building houses', () => {
  it('needs the whole color set', () => {
    const s = setup((s) => give(s, 0, 1));
    expect(canBuildHouse(s, 1)).toBe(false);
    expect(() => play(s, build(1))).toThrow(GameError);
  });

  it('costs the house price and adds a house', () => {
    const s = play(brownSet(), build(1));
    expect(s.ownership[1].houses).toBe(1);
    expect(s.players[0].cash).toBe(15_000_000 - 500_000);
    expect(s.log.at(-1)).toMatchObject({ type: 'builtHouse', space: 1, houses: 1, cost: 500_000 });
    expect(s.phase.kind).toBe('awaitRoll'); // managing doesn't change the turn
  });

  it('must build evenly across the set', () => {
    const s = play(brownSet(), build(1));
    expect(canBuildHouse(s, 1)).toBe(false); // 1 is already a house ahead
    expect(canBuildHouse(s, 3)).toBe(true);
    expect(canBuildHouse(play(s, build(3)), 1)).toBe(true);
  });

  it('goes up to a hotel and no further', () => {
    let s = brownSet();
    for (let i = 0; i < HOTEL; i++) s = play(s, build(1), build(3));
    expect(s.ownership[1].houses).toBe(HOTEL);
    expect(s.players[0].cash).toBe(15_000_000 - 10 * 500_000);
    expect(canBuildHouse(s, 1)).toBe(false);
  });

  it('charges hotel rent', () => {
    let s = brownSet();
    for (let i = 0; i < HOTEL; i++) s = play(s, build(1), build(3));
    s = setup((d) => (d.current = 1), s);
    s = play(s, roll(1, 2)); // Lan lands on Lò kẹo cu đơ
    expect(s.players[1].cash).toBe(15_000_000 - 4_500_000);
  });

  it('is not allowed with a mortgaged property in the set', () => {
    const s = setup((s) => (s.ownership[3].mortgaged = true), brownSet());
    expect(canBuildHouse(s, 1)).toBe(false);
  });

  it('needs enough cash', () => {
    const s = setup((s) => (s.players[0].cash = 499_999), brownSet());
    expect(canBuildHouse(s, 1)).toBe(false);
  });

  it('is only allowed on your own turn', () => {
    const s = setup((s) => (s.current = 1), brownSet());
    expect(canBuildHouse(s, 1)).toBe(false);
  });

  it('works at any point of your turn, also after rolling', () => {
    const s = play(brownSet(), roll(2, 3), { type: 'DECLINE' });
    expect(legalActions(s)).toEqual(['END_TURN']);
    expect(canBuildHouse(s, 1)).toBe(true);
  });
});

describe('selling houses', () => {
  const twoAndOne = () => play(brownSet(), build(1), build(3), build(1)); // 2 houses on 1, 1 on 3

  it('refunds half the house price', () => {
    const before = twoAndOne();
    const s = play(before, sell(1));
    expect(s.ownership[1].houses).toBe(1);
    expect(s.players[0].cash).toBe(before.players[0].cash + 250_000);
  });

  it('must sell evenly: from the property with the most houses first', () => {
    const s = twoAndOne();
    expect(canSellHouse(s, 3)).toBe(false);
    expect(canSellHouse(s, 1)).toBe(true);
  });

  it('turns a hotel back into 4 houses', () => {
    let s = brownSet();
    for (let i = 0; i < HOTEL; i++) s = play(s, build(1), build(3));
    s = play(s, sell(1));
    expect(s.ownership[1].houses).toBe(4);
    expect(s.log.at(-1)).toMatchObject({ type: 'soldHouse', houses: 4, refund: 250_000 });
  });
});

describe('mortgages', () => {
  it('pays half the price and stops rent', () => {
    const s = play(brownSet(), mortgage(1));
    expect(s.ownership[1].mortgaged).toBe(true);
    expect(s.players[0].cash).toBe(15_000_000 + 300_000);
  });

  it('cannot mortgage twice', () => {
    expect(canMortgage(play(brownSet(), mortgage(1)), 1)).toBe(false);
  });

  it('cannot mortgage while the set has buildings', () => {
    const s = play(brownSet(), build(1));
    expect(canMortgage(s, 1)).toBe(false);
    expect(canMortgage(s, 3)).toBe(false); // even the property without a house
  });

  it('works for transport and utilities too', () => {
    const s = play(
      setup((s) => give(s, 0, 5)),
      mortgage(5),
    );
    expect(s.players[0].cash).toBe(15_000_000 + 1_000_000);
  });

  it('costs the mortgage value + 10% to lift', () => {
    const mortgaged = play(brownSet(), mortgage(1));
    const s = play(mortgaged, unmortgage(1));
    expect(s.ownership[1].mortgaged).toBe(false);
    expect(s.players[0].cash).toBe(mortgaged.players[0].cash - 330_000);
  });

  it('needs enough cash to lift', () => {
    const s = setup((s) => (s.players[0].cash = 329_999), play(brownSet(), mortgage(1)));
    expect(canUnmortgage(s, 1)).toBe(false);
  });

  it("can't touch other players' properties", () => {
    const s = setup((s) => give(s, 1, 6));
    expect(canMortgage(s, 6)).toBe(false);
  });
});

describe('raising money while in debt', () => {
  /** Đăng has the brown set with 1 house each and 100k cash, and lands on Lan's Biển Thạch Hải with 2 houses (2tr). */
  const inDebt = () => {
    let s = play(brownSet(), build(1), build(3));
    s = setup((d) => {
      d.players[0].cash = 100_000;
      d.players[0].position = 10;
      give(d, 1, 16, 18, 19);
      d.ownership[16].houses = 2;
    }, s);
    return play(s, roll(2, 4)); // 10 + 6 = 16
  };

  it('lets the debtor sell houses and mortgage, but not build or unmortgage', () => {
    const s = inDebt();
    expect(s.phase).toMatchObject({ kind: 'inDebt', debtor: 0, amount: 2_000_000 });
    const types = new Set(propertyActions(s).map((a) => a.type));
    expect(types).toEqual(new Set(['SELL_HOUSE']));

    const sold = play(s, sell(1), sell(3));
    expect(new Set(propertyActions(sold).map((a) => a.type))).toEqual(new Set(['MORTGAGE']));
  });

  it('can raise enough to pay and carry on', () => {
    let s = play(inDebt(), sell(1), sell(3), mortgage(1), mortgage(3));
    expect(s.players[0].cash).toBe(100_000 + 500_000 + 600_000);
    expect(legalActions(s)).toEqual(['DECLARE_BANKRUPTCY']); // 1tr2 < 2tr
    s = setup((d) => give(d, 0, 5), s);
    s = play(s, mortgage(5));
    expect(legalActions(s)).toEqual(['PAY_DEBT', 'DECLARE_BANKRUPTCY']);
    s = play(s, { type: 'PAY_DEBT' });
    expect(s.players[0].cash).toBe(200_000); // 1tr2 + 1tr (transport) - 2tr
    expect(legalActions(s)).toEqual(['END_TURN']);
  });

  it('gives the creditor half the value of any buildings on bankruptcy', () => {
    const s = play(inDebt(), { type: 'DECLARE_BANKRUPTCY' });
    // 100k cash + 2 houses sold at 250k each
    expect(s.players[1].cash).toBe(15_000_000 + 100_000 + 500_000);
    expect(s.ownership[1]).toEqual({ owner: 1, houses: 0, mortgaged: false });
  });
});

describe('propertyActions', () => {
  it('lists what the acting player can do', () => {
    const actions = propertyActions(brownSet());
    expect(actions).toEqual(
      expect.arrayContaining([build(1), build(3), mortgage(1), mortgage(3)] as unknown[]),
    );
    expect(actions).toHaveLength(4);
  });

  it('is empty once the game is over', () => {
    const s = setup((s) => (s.phase = { kind: 'gameOver', winner: 0 }), brownSet());
    expect(propertyActions(s)).toEqual([]);
  });
});
