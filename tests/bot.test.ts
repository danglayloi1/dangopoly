import { describe, expect, it } from 'vitest';
import { botAction, BOT_LEVELS } from '../src/engine/bot';
import { applyAction, createGame } from '../src/engine/game';
import type { BotLevel, GameState } from '../src/engine/types';

// Board spots used below:
//  1 Vườn bưởi Phúc Trạch + 3 Lò kẹo cu đơ = brown set (600k each, house 500k)
//  6, 8, 9 = light blue set · 39 Đường Quang Trung (4tr)

const TR = 1_000_000;

/** Player 0 is a person, player 1 a bot of the given level. */
function newGame(level: BotLevel = 'normal'): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Cu Đơ', token: 'conTrau', bot: level },
    ],
    seed: 7,
  });
}

/** The same game, on the bot's turn, changed by `change`. */
function botTurn(change: (s: GameState) => void, level: BotLevel = 'normal'): GameState {
  const s = structuredClone(newGame(level));
  s.current = 1;
  change(s);
  return s;
}

function give(s: GameState, owner: number, ...spaces: number[]): void {
  for (const space of spaces) s.ownership[space] = { owner, houses: 0, mortgaged: false };
}

describe('whose move', () => {
  it('leaves people alone', () => {
    expect(botAction(newGame())).toBeNull();
  });

  it('rolls on its own turn', () => {
    expect(botAction(botTurn(() => {}))).toEqual({ type: 'ROLL' });
  });

  it('answers a trade offered to it, even on the other player’s turn', () => {
    const s = structuredClone(newGame());
    give(s, 0, 39);
    const offered = applyAction(s, {
      type: 'PROPOSE_TRADE',
      offer: { from: 0, to: 1, give: { spaces: [39], cash: 0, jailCards: 0 }, take: { spaces: [], cash: 0, jailCards: 0 } },
    });
    expect(botAction(offered)?.type).toBe('ACCEPT_TRADE'); // a free 4tr street
  });
});

describe('buying', () => {
  it('buys what it can afford with money to spare', () => {
    const s = botTurn((s) => (s.phase = { kind: 'awaitBuy', space: 39 }));
    expect(botAction(s)).toEqual({ type: 'BUY' });
  });

  it('keeps a reserve instead of spending its last money', () => {
    const s = botTurn((s) => {
      s.phase = { kind: 'awaitBuy', space: 39 };
      s.players[1].cash = 4.5 * TR;
    });
    expect(botAction(s)).toEqual({ type: 'DECLINE' });
  });

  it('stretches to complete a color set, or to block one', () => {
    const completes = botTurn((s) => {
      give(s, 1, 1);
      s.phase = { kind: 'awaitBuy', space: 3 };
      s.players[1].cash = 1 * TR;
    });
    expect(botAction(completes)).toEqual({ type: 'BUY' });
    const blocks = botTurn((s) => {
      give(s, 0, 1);
      s.phase = { kind: 'awaitBuy', space: 3 };
      s.players[1].cash = 1 * TR;
    });
    expect(botAction(blocks)).toEqual({ type: 'BUY' });
  });
});

describe('building', () => {
  it('builds on a whole set before ending its turn, evenly', () => {
    let s = botTurn((s) => {
      give(s, 1, 1, 3);
      s.phase = { kind: 'awaitEndTurn' };
    });
    expect(botAction(s)).toEqual({ type: 'BUILD_HOUSE', space: 3 });
    s = applyAction(s, botAction(s)!);
    expect(botAction(s)).toEqual({ type: 'BUILD_HOUSE', space: 1 });
  });

  it('stops building at its level’s limit, then ends the turn', () => {
    const s = botTurn((s) => {
      give(s, 1, 1, 3);
      s.ownership[1].houses = 3;
      s.ownership[3].houses = 3;
      s.phase = { kind: 'awaitEndTurn' };
    }, 'easy');
    expect(botAction(s)).toEqual({ type: 'END_TURN' });
  });
});

describe('debts', () => {
  const inDebt = (amount: number) =>
    botTurn((s) => {
      give(s, 1, 1, 39);
      s.players[1].cash = 0;
      s.phase = { kind: 'inDebt', debtor: 1, creditor: 0, amount, reason: { kind: 'rent', space: 6 } };
    });

  it('mortgages to raise money, then pays', () => {
    let s = inDebt(1 * TR);
    const first = botAction(s);
    expect(first?.type).toBe('MORTGAGE');
    for (let i = 0; i < 5 && s.phase.kind === 'inDebt'; i++) s = applyAction(s, botAction(s)!);
    expect(s.phase.kind).not.toBe('inDebt');
    expect(s.players[1].bankrupt).toBe(false);
  });

  it('gives up at once when everything it has would not cover the debt', () => {
    expect(botAction(inDebt(50 * TR))).toEqual({ type: 'DECLARE_BANKRUPTCY' });
  });
});

describe('trades', () => {
  const offer = (give: number[], take: number[], cash = 0) => {
    const s = structuredClone(newGame());
    give.forEach((i) => (s.ownership[i] = { owner: 0, houses: 0, mortgaged: false }));
    take.forEach((i) => (s.ownership[i] = { owner: 1, houses: 0, mortgaged: false }));
    return applyAction(s, {
      type: 'PROPOSE_TRADE',
      offer: { from: 0, to: 1, give: { spaces: give, cash, jailCards: 0 }, take: { spaces: take, cash: 0, jailCards: 0 } },
    });
  };

  it('refuses a deal that hands the other player a whole set', () => {
    const s = offer([], [3], 1 * TR);
    s.ownership[1] = { owner: 0, houses: 0, mortgaged: false }; // Đăng already has the other brown
    expect(botAction(s)?.type).toBe('REJECT_TRADE');
  });

  it('takes a deal where it clearly comes out ahead', () => {
    expect(botAction(offer([39], [1]))?.type).toBe('ACCEPT_TRADE');
  });

  it('offers to buy the piece it is missing from a set, then waits a while before asking again', () => {
    const s = botTurn((s) => {
      give(s, 1, 1);
      give(s, 0, 3);
    });
    const action = botAction(s);
    expect(action?.type).toBe('PROPOSE_TRADE');
    const proposal = action as Extract<typeof action, { type: 'PROPOSE_TRADE' }>;
    expect(proposal.offer.take.spaces).toEqual([3]);
    expect(proposal.offer.give.cash).toBeGreaterThan(600_000); // more than its price
    const refused = applyAction(applyAction(s, proposal), { type: 'REJECT_TRADE' });
    expect(botAction(refused)).toEqual({ type: 'ROLL' });
  });
});

describe('whole games', () => {
  it('bots of every level play games to the end without breaking a rule', () => {
    let finished = 0;
    for (let seed = 1; seed <= 24; seed++) {
      let s = createGame({
        players: [0, 1, 2, 3].slice(0, 2 + (seed % 3)).map((i) => ({
          name: `Máy ${i}`,
          token: (['nonLa', 'conTrau', 'quaCam', 'bongDa'] as const)[i],
          bot: BOT_LEVELS[(seed + i) % 3],
        })),
        seed,
        startingCash: 5 * TR,
        rules: {
          mode: { kind: 'rounds', rounds: 40 },
          festivals: seed % 2 === 0,
          ...(seed % 3 === 0 ? { viet: { tet: true, anVa: true, macCa: true, funnyCards: true } } : {}), // Chế độ Việt in a third of the games
        },
      });
      for (let step = 0; step < 20_000 && s.phase.kind !== 'gameOver'; step++) {
        const action = botAction(s);
        expect(action).not.toBeNull();
        s = applyAction(s, action!); // throws if a bot ever tries something the rules forbid
      }
      if (s.phase.kind === 'gameOver') finished++;
    }
    expect(finished).toBe(24);
  }, 60_000);
});
