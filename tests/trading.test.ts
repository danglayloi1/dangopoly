import { describe, expect, it } from 'vitest';
import { canBuildHouse, propertyActions } from '../src/engine/buildings';
import { applyAction, createGame, GameError, legalActions } from '../src/engine/game';
import { canStartTrade, tradeProblem } from '../src/engine/trading';
import type { Action, Dice, GameState, TradeOffer } from '../src/engine/types';

// Board spots used below:
//  1 Vườn bưởi + 3 Lò kẹo cu đơ = brown set · 6, 8, 9 = light blue set · 5 Bến xe (transport)

function newGame(players = 2): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
      { name: 'Minh', token: 'xeDap' },
    ].slice(0, players) as { name: string; token: 'nonLa' | 'conTrau' | 'xeDap' }[],
    seed: 3,
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
const roll = (...dice: Dice): Action => ({ type: 'ROLL', dice });
const ACCEPT: Action = { type: 'ACCEPT_TRADE' };
const REJECT: Action = { type: 'REJECT_TRADE' };

interface OfferParts {
  from?: number;
  to?: number;
  give?: Partial<TradeOffer['give']>;
  take?: Partial<TradeOffer['take']>;
}

function offer(partial: OfferParts): TradeOffer {
  return {
    from: partial.from ?? 0,
    to: partial.to ?? 1,
    give: { spaces: [], cash: 0, jailCards: 0, ...partial.give } as TradeOffer['give'],
    take: { spaces: [], cash: 0, jailCards: 0, ...partial.take } as TradeOffer['take'],
  };
}
const propose = (o: TradeOffer): Action => ({ type: 'PROPOSE_TRADE', offer: o });

/** Đăng owns Vườn bưởi (1), Lan owns Lò kẹo cu đơ (3) and Bến xe (5). */
const splitBrown = () =>
  setup((s) => {
    give(s, 0, 1);
    give(s, 1, 3, 5);
  });

describe('proposing a trade', () => {
  it('waits for the other player to answer', () => {
    const o = offer({ give: { cash: 500_000 }, take: { spaces: [3] } });
    const s = play(splitBrown(), propose(o));
    expect(s.phase).toEqual({ kind: 'tradeOffer', offer: o, resume: { kind: 'awaitRoll' } });
    expect(legalActions(s)).toEqual(['ACCEPT_TRADE', 'REJECT_TRADE']);
    expect(s.log.at(-1)).toEqual({ type: 'tradeProposed', offer: o });
  });

  it('freezes the game until answered', () => {
    const s = play(splitBrown(), propose(offer({ take: { spaces: [3] } })));
    expect(() => play(s, roll(1, 2))).toThrow(GameError);
    expect(propertyActions(s)).toEqual([]);
    expect(tradeProblem(s, offer({ take: { spaces: [5] } }))).toBe('notNow');
  });

  it('keeps its own copy of the offer', () => {
    const o = offer({ take: { spaces: [3] } });
    const s = play(splitBrown(), propose(o));
    o.take.spaces.push(5);
    expect(s.phase.kind === 'tradeOffer' && s.phase.offer.take.spaces).toEqual([3]);
  });
});

describe('accepting and rejecting', () => {
  it('swaps properties and cash both ways on accept', () => {
    const o = offer({ give: { spaces: [1], cash: 300_000 }, take: { spaces: [3, 5], cash: 100_000 } });
    const s = play(splitBrown(), propose(o), ACCEPT);
    expect(s.ownership[1].owner).toBe(1);
    expect(s.ownership[3].owner).toBe(0);
    expect(s.ownership[5].owner).toBe(0);
    expect(s.players[0].cash).toBe(15_000_000 - 300_000 + 100_000);
    expect(s.players[1].cash).toBe(15_000_000 + 300_000 - 100_000);
    expect(s.log.at(-1)).toEqual({ type: 'tradeAccepted', offer: o });
    expect(legalActions(s)).toEqual(['ROLL']); // the turn carries on
  });

  it('changes nothing on reject', () => {
    const before = splitBrown();
    const s = play(before, propose(offer({ take: { spaces: [3] } })), REJECT);
    expect(s.ownership).toEqual(before.ownership);
    expect(s.players.map((p) => p.cash)).toEqual(before.players.map((p) => p.cash));
    expect(s.log.at(-1)?.type).toBe('tradeRejected');
    expect(legalActions(s)).toEqual(['ROLL']);
  });

  it('works after rolling, then goes back to ending the turn', () => {
    const rolled = play(splitBrown(), roll(1, 5), { type: 'DECLINE' }); // lands on 6, doesn't buy
    expect(legalActions(rolled)).toEqual(['END_TURN']);
    const s = play(rolled, propose(offer({ give: { cash: 1_000_000 }, take: { spaces: [3] } })), ACCEPT);
    expect(legalActions(s)).toEqual(['END_TURN']);
  });

  it('can complete a color set so the new owner can build', () => {
    const s = play(splitBrown(), propose(offer({ give: { cash: 1_000_000 }, take: { spaces: [3] } })), ACCEPT);
    expect(canBuildHouse(s, 1)).toBe(true);
  });

  it('hands over mortgaged properties still mortgaged', () => {
    const base = setup((s) => (s.ownership[3].mortgaged = true), splitBrown());
    const s = play(base, propose(offer({ take: { spaces: [3] } })), ACCEPT);
    expect(s.ownership[3]).toEqual({ owner: 0, houses: 0, mortgaged: true });
  });
});

describe('invalid offers', () => {
  const problem = (o: TradeOffer, base = splitBrown()) => tradeProblem(base, o);

  it('only the current player, before rolling or before ending the turn', () => {
    expect(problem(offer({ from: 1, to: 0, give: { spaces: [3] } }))).toBe('notNow');
    const buying = play(splitBrown(), roll(1, 5)); // 6, unowned: waiting to buy
    expect(problem(offer({ take: { spaces: [3] } }), buying)).toBe('notNow');
  });

  it('needs another player who is still in the game', () => {
    expect(problem(offer({ to: 0, give: { cash: 1 } }))).toBe('badPartner');
    expect(problem(offer({ to: 7, give: { cash: 1 } }))).toBe('badPartner');
    const out = setup((s) => (s.players[2].bankrupt = true), newGame(3));
    expect(problem(offer({ to: 2, give: { cash: 1 } }), out)).toBe('badPartner');
  });

  it('must contain something', () => {
    expect(problem(offer({}))).toBe('empty');
  });

  it('checks who owns each space', () => {
    expect(problem(offer({ give: { spaces: [3] } }))).toBe('notOwned'); // Lan's
    expect(problem(offer({ take: { spaces: [1] } }))).toBe('notOwned'); // Đăng's own
    expect(problem(offer({ take: { spaces: [9] } }))).toBe('notOwned'); // the bank's
    expect(problem(offer({ take: { spaces: [3, 3] } }))).toBe('notOwned');
  });

  it('checks the cash on both sides', () => {
    expect(problem(offer({ give: { cash: 15_000_001 } }))).toBe('notEnoughCash');
    expect(problem(offer({ take: { cash: 20_000_000 } }))).toBe('notEnoughCash');
    expect(problem(offer({ give: { cash: -5 } }))).toBe('badCash');
    expect(problem(offer({ give: { cash: 0.5 } }))).toBe('badCash');
  });

  it('refuses properties whose color set has buildings', () => {
    const built = setup((s) => {
      give(s, 0, 6, 8, 9);
      s.ownership[6].houses = 1;
    });
    expect(problem(offer({ give: { spaces: [8] } }), built)).toBe('hasBuildings');
    expect(problem(offer({ give: { spaces: [6] } }), built)).toBe('hasBuildings');
  });

  it('is rejected by the engine too', () => {
    expect(() => play(splitBrown(), propose(offer({ give: { spaces: [3] } })))).toThrow(GameError);
  });
});

describe('canStartTrade', () => {
  it('is true on your turn with someone to trade with', () => {
    expect(canStartTrade(newGame())).toBe(true);
  });

  it('is false while waiting to buy or with no one left', () => {
    expect(canStartTrade(play(splitBrown(), roll(1, 5)))).toBe(false);
    expect(canStartTrade(setup((s) => (s.players[1].bankrupt = true)))).toBe(false);
  });
});
