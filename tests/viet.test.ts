import { describe, expect, it } from 'vitest';
import { CARDS, CLASSIC_CARD_COUNT } from '../src/data/cards';
import { applyAction, buyPrice, CLASSIC_RULES, createGame, legalActions, NO_VIET, type RulesChoice } from '../src/engine/game';
import { botAction } from '../src/engine/bot';
import { TET_EVERY, TET_MAX } from '../src/engine/rounds';
import { cleanAction, cleanRules } from '../server/room';
import { parseSave, serializeGame } from '../src/engine/save';
import type { GameState, VietRules } from '../src/engine/types';

// Board spots used below: 7 = Cơ hội (3 + 4 from Xuất phát), 39 Đường Quang Trung (4tr).
const TR = 1_000_000;

function newGame(viet: Partial<VietRules> = {}, extra: Partial<RulesChoice> = {}): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
      { name: 'Minh', token: 'quaCam' },
    ],
    seed: 11,
    rules: { ...CLASSIC_RULES, ...extra, viet: { ...NO_VIET, ...viet } },
  });
}

const change = (s: GameState, f: (s: GameState) => void) => {
  const c = structuredClone(s);
  f(c);
  return c;
};

describe('Chế độ Việt is optional', () => {
  it('leaves a classic game exactly as before, cards and all', () => {
    const before = createGame({ players: [{ name: 'A', token: 'nonLa' }, { name: 'B', token: 'conTrau' }], seed: 3 });
    const allOff = createGame({ players: [{ name: 'A', token: 'nonLa' }, { name: 'B', token: 'conTrau' }], seed: 3, rules: { ...CLASSIC_RULES, viet: NO_VIET } });
    expect(allOff).toEqual(before); // no viet field, same decks
    expect(before.decks.chance).toHaveLength(CLASSIC_CARD_COUNT.chance);
  });

  it('shuffles the funny cards in only when asked', () => {
    const g = newGame({ funnyCards: true });
    expect(g.decks.chance).toHaveLength(CARDS.chance.length);
    expect(g.decks.community).toHaveLength(CARDS.community.length);
    expect(CARDS.chance.length).toBeGreaterThan(CLASSIC_CARD_COUNT.chance);
  });

  it('saves and loads with its rules and a haggled price', () => {
    let g = newGame({ macCa: true, anVa: true });
    g = change(g, (s) => (s.phase = { kind: 'awaitBuy', space: 39, price: 3_200_000, haggled: true }));
    const loaded = parseSave(serializeGame(g));
    expect(loaded?.game.rules.viet).toEqual(g.rules.viet);
    expect(loaded?.game.phase).toEqual(g.phase);
  });
});

describe('Mặc cả', () => {
  const offered = (viet: Partial<VietRules>, rng: number) =>
    change(newGame(viet), (s) => {
      s.phase = { kind: 'awaitBuy', space: 39 };
      s.rngState = rng;
    });

  it('is only offered with the rule on, and only once', () => {
    expect(legalActions(offered({}, 1))).not.toContain('HAGGLE');
    const g = offered({ macCa: true }, 1);
    expect(legalActions(g)).toEqual(['BUY', 'HAGGLE', 'DECLINE']);
    expect(legalActions(applyAction(g, { type: 'HAGGLE' }))).not.toContain('HAGGLE');
  });

  it('ends 20% off or 10% up, and buying charges that price', () => {
    const prices = new Set<number>();
    for (let rng = 1; rng <= 20; rng++) {
      const after = applyAction(offered({ macCa: true }, rng), { type: 'HAGGLE' });
      const price = buyPrice(after);
      prices.add(price);
      const bought = applyAction(after, { type: 'BUY' });
      expect(bought.players[0].cash).toBe(after.players[0].cash - price);
    }
    expect([...prices].sort()).toEqual([3_200_000, 4_400_000]);
  });
});

describe('Ăn vạ', () => {
  const owing = (viet: Partial<VietRules>, cash: number, amount = 2 * TR) =>
    change(newGame(viet), (s) => {
      s.players[0].cash = cash;
      s.phase = { kind: 'inDebt', debtor: 0, creditor: 1, amount, reason: { kind: 'rent', space: 39 } };
    });

  it('lets someone who can’t pay off 20% of the debt, once a game', () => {
    const g = owing({ anVa: true }, 1_700_000);
    expect(legalActions(g)).toEqual(['AN_VA', 'DECLARE_BANKRUPTCY']);
    const after = applyAction(g, { type: 'AN_VA' });
    expect(after.phase).toMatchObject({ kind: 'inDebt', amount: 1_600_000 });
    expect(legalActions(after)).toEqual(['PAY_DEBT', 'DECLARE_BANKRUPTCY']);
    expect(after.players[0].anVaUsed).toBe(true);
    // Used: the next time there's no tantrum to throw.
    const again = change(after, (s) => (s.phase = { kind: 'inDebt', debtor: 0, creditor: 1, amount: 99 * TR, reason: { kind: 'card' } }));
    expect(legalActions(again)).toEqual(['DECLARE_BANKRUPTCY']);
  });

  it('is not there when the money is (or the rule is off)', () => {
    expect(legalActions(owing({ anVa: true }, 5 * TR))).not.toContain('AN_VA');
    expect(legalActions(owing({}, 0))).not.toContain('AN_VA');
  });
});

describe('Tết lì xì', () => {
  /** Plays END_TURN until round `round` starts. */
  const toRound = (g: GameState, round: number) => {
    let s = g;
    while (s.round < round) {
      s = change(s, (c) => (c.phase = { kind: 'awaitEndTurn' }));
      s = applyAction(s, { type: 'END_TURN' });
    }
    return s;
  };

  it('every few rounds, the richest gives the poorest a tenth of the gap', () => {
    const g = change(newGame({ tet: true }), (s) => {
      s.players[0].cash = 25 * TR;
      s.players[2].cash = 5 * TR;
    });
    const s = toRound(g, TET_EVERY);
    const gift = s.log.find((e) => e.type === 'tetLiXi');
    expect(gift).toEqual({ type: 'tetLiXi', from: 0, to: 2, amount: 2 * TR, round: TET_EVERY });
    expect(s.players[2].cash).toBe(7 * TR);
  });

  it('is capped, and doesn’t happen without the rule', () => {
    const rich = change(newGame({ tet: true }), (s) => {
      s.players[0].cash = 95 * TR;
      s.players[2].cash = 1 * TR;
    });
    expect(toRound(rich, TET_EVERY).log.find((e) => e.type === 'tetLiXi')).toMatchObject({ amount: TET_MAX });
    expect(toRound(newGame(), TET_EVERY).log.some((e) => e.type === 'tetLiXi')).toBe(false);
  });
});

describe('funny cards', () => {
  /** Đăng lands on Cơ hội (space 7) with the given funny card on top of the deck. */
  const draw = (cardText: string, f: (s: GameState) => void = () => {}) => {
    const index = CARDS.chance.findIndex((c) => c.funny && c.text.vi.startsWith(cardText));
    expect(index).toBeGreaterThanOrEqual(CLASSIC_CARD_COUNT.chance);
    const g = change(newGame({ funnyCards: true }), (s) => {
      s.decks.chance = [index, ...s.decks.chance.filter((c) => c !== index)];
      f(s);
    });
    return applyAction(g, { type: 'ROLL', dice: [3, 4] });
  };

  it('Mẹ gọi về ăn cơm: home to Xuất phát with no salary', () => {
    const s = draw('Mẹ gọi về');
    expect(s.players[0].position).toBe(0);
    expect(s.players[0].cash).toBe(15 * TR);
  });

  it('Bị chó đuổi: runs 3 more spaces', () => {
    expect(draw('Bị chó').players[0].position).toBe(10);
  });

  it('Trúng số vé năm ngoái: nothing happens', () => {
    const s = draw('Trúng số');
    expect(s.players[0].cash).toBe(15 * TR);
    expect(s.phase.kind).toBe('awaitEndTurn');
  });
});

describe('bots and Chế độ Việt', () => {
  const botGame = (level: 'easy' | 'normal' | 'hard') =>
    createGame({
      players: [
        { name: 'Đăng', token: 'nonLa' },
        { name: 'Cu Đơ', token: 'conTrau', bot: level },
      ],
      seed: 4,
      rules: { ...CLASSIC_RULES, viet: { ...NO_VIET, macCa: true, anVa: true } },
    });

  it('a bot haggles over a place it wants, then decides at the new price', () => {
    const g = change(botGame('normal'), (s) => {
      s.current = 1;
      s.phase = { kind: 'awaitBuy', space: 39 };
    });
    expect(botAction(g)).toEqual({ type: 'HAGGLE' });
    const after = applyAction(g, { type: 'HAGGLE' });
    expect(['BUY', 'DECLINE']).toContain(botAction(after)?.type);
  });

  it('a Khó bot keeps its tantrum for when it would otherwise go bankrupt', () => {
    const owing = (cash: number, amount: number) =>
      change(botGame('hard'), (s) => {
        s.players[1].cash = cash;
        s.ownership[1] = { owner: 1, houses: 0, mortgaged: false };
        s.phase = { kind: 'inDebt', debtor: 1, creditor: 0, amount, reason: { kind: 'rent', space: 39 } };
      });
    expect(botAction(owing(1_000_000, 1_200_000))?.type).toBe('MORTGAGE'); // can raise it: no tantrum yet
    expect(botAction(owing(1_000_000, 1_500_000))?.type).toBe('AN_VA'); // 1tr + 300k mortgage < 1tr5: tantrum
  });
});

describe('Chế độ Việt online', () => {
  it('the room accepts the options and the two new moves, and nothing else', () => {
    expect(cleanRules({ mode: { kind: 'classic' }, festivals: false, viet: { tet: true, macCa: true } })).toEqual({
      mode: { kind: 'classic' },
      festivals: false,
      viet: { tet: true, anVa: false, macCa: true, funnyCards: false },
    });
    expect(cleanRules({ mode: { kind: 'classic' }, festivals: false, viet: { tet: 'yes' } })).toBeNull();
    expect(cleanAction({ type: 'HAGGLE', price: 1 })).toEqual({ type: 'HAGGLE' }); // no choosing your own price
    expect(cleanAction({ type: 'AN_VA' })).toEqual({ type: 'AN_VA' });
  });
});
