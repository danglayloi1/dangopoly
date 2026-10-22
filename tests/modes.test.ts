import { describe, expect, it } from 'vitest';
import { canBuildHouse } from '../src/engine/buildings';
import { applyAction, createGame, GameError, legalActions, type RulesChoice } from '../src/engine/game';
import { BOARD } from '../src/data/board';
import { FESTIVAL_GIFT, FESTIVALS, worthOf } from '../src/engine/rounds';
import { STRINGS } from '../src/i18n/strings';
import { festivalText } from '../src/ui/logText';
import { parseSave, SAVE_VERSION, serializeGame } from '../src/engine/save';
import type { Action, GameState } from '../src/engine/types';
import { awards } from '../src/ui/summary';

const PLAYERS = [
  { name: 'Đăng', token: 'nonLa' as const },
  { name: 'Lan', token: 'conTrau' as const },
];

function newGame(rules?: RulesChoice, now = 1_000_000): GameState {
  return createGame({ players: PLAYERS.map((p) => ({ ...p })), seed: 5, rules, now });
}

/** Ends the current player's turn without moving (as if they had already rolled). */
function endTurn(state: GameState): GameState {
  const s = structuredClone(state);
  s.phase = { kind: 'awaitEndTurn' };
  return applyAction(s, { type: 'END_TURN' });
}

const play = (state: GameState, ...actions: Action[]) => actions.reduce(applyAction, state);

describe('rounds', () => {
  it('start at 1 and go up when play comes back around to the first player', () => {
    let s = newGame();
    expect(s.round).toBe(1);
    s = endTurn(s); // Đăng → Lan
    expect(s.round).toBe(1);
    s = endTurn(s); // Lan → Đăng: round 2
    expect(s.round).toBe(2);
    expect(s.log.at(-2)).toEqual({ type: 'roundStarted', round: 2 });
    expect(s.worth).toHaveLength(2); // at the start of round 1 and of round 2
  });

  it('with a round limit, end after the last round and the richest player wins', () => {
    let s = newGame({ mode: { kind: 'rounds', rounds: 2 }, festivals: false });
    s.players[1].cash = 20_000_000;
    for (let i = 0; i < 3; i++) s = endTurn(s);
    expect(s.phase.kind).not.toBe('gameOver');
    s = endTurn(s); // end of round 2
    expect(s.phase).toEqual({ kind: 'gameOver', winner: 1 });
    expect(s.endReason).toBe('rounds');
    expect(s.log.slice(-2)).toEqual([
      { type: 'limitReached', reason: 'rounds' },
      { type: 'won', player: 1 },
    ]);
  });

  it('count land and houses in wealth, mortgaged land at half', () => {
    const s = newGame();
    s.ownership[1] = { owner: 0, houses: 2, mortgaged: false }; // 600k + 2 houses × 500k
    s.ownership[3] = { owner: 0, houses: 0, mortgaged: true }; // 600k mortgaged → 300k
    expect(worthOf(s, 0)).toBe(15_000_000 + 600_000 + 1_000_000 + 300_000);
    s.players[1].bankrupt = true;
    expect(worthOf(s, 1)).toBe(0);
  });

  it('break a tie in wealth by cash', () => {
    let s = newGame({ mode: { kind: 'rounds', rounds: 1 }, festivals: false });
    s.ownership[1] = { owner: 1, houses: 0, mortgaged: false };
    s.players[1].cash -= 600_000; // same wealth as Đăng, less cash
    s = endTurn(endTurn(s));
    expect(s.phase).toEqual({ kind: 'gameOver', winner: 0 });
  });

  it('refuse impossible limits', () => {
    expect(() => newGame({ mode: { kind: 'rounds', rounds: 0 }, festivals: false })).toThrow(GameError);
    expect(() => newGame({ mode: { kind: 'time', minutes: 1.5 }, festivals: false })).toThrow(GameError);
  });
});

describe('time limit', () => {
  it('records when time runs out', () => {
    const s = newGame({ mode: { kind: 'time', minutes: 30 }, festivals: false }, 5_000);
    expect(s.rules.mode).toEqual({ kind: 'time', minutes: 30, endsAt: 5_000 + 30 * 60_000 });
  });

  it('ends the game at the start of a turn, richest player winning', () => {
    const s = newGame({ mode: { kind: 'time', minutes: 30 }, festivals: false });
    s.players[0].cash = 1_000_000;
    const done = applyAction(s, { type: 'TIME_UP' });
    expect(done.phase).toEqual({ kind: 'gameOver', winner: 1 });
    expect(done.endReason).toBe('time');
  });

  it('is only possible in timed games, before rolling', () => {
    expect(() => applyAction(newGame(), { type: 'TIME_UP' })).toThrow(GameError);
    const timed = newGame({ mode: { kind: 'time', minutes: 30 }, festivals: false });
    const rolled = applyAction(timed, { type: 'ROLL', dice: [1, 2] });
    expect(() => applyAction(rolled, { type: 'TIME_UP' })).toThrow(GameError);
    expect(legalActions(timed)).not.toContain('TIME_UP'); // never a button
  });
});

describe('festivals', () => {
  const festive = (): GameState => newGame({ mode: { kind: 'classic' }, festivals: true });
  const toRound = (state: GameState, round: number) => {
    let s = state;
    while (s.round < round) s = endTurn(s);
    return s;
  };

  it('come every third round and last that round', () => {
    const s = toRound(festive(), 3);
    expect(s.festival).not.toBeNull();
    expect(s.log.some((e) => e.type === 'festival' && e.round === 3)).toBe(true);
    expect(toRound(s, 4).festival).toBeNull();
    expect(toRound(newGame(), 3).festival).toBeNull(); // festival mode off
  });

  it('Đền Cuông: double rent on one color set', () => {
    const s = newGame();
    s.ownership[3] = { owner: 1, houses: 0, mortgaged: false }; // Lò kẹo cu đơ (brown), rent 40k
    s.festival = { id: 'denCuong', group: 'brown' };
    expect(play(s, { type: 'ROLL', dice: [1, 2] }).stats[1].rentReceived).toBe(80_000);
    s.festival = { id: 'denCuong', group: 'red' }; // another set: normal rent
    expect(play(s, { type: 'ROLL', dice: [1, 2] }).stats[1].rentReceived).toBe(40_000);
  });

  it('Làng Sen: double salary for passing Xuất phát', () => {
    const s = newGame();
    s.players[0].position = 38;
    s.festival = { id: 'langSen', group: null };
    const after = play(s, { type: 'ROLL', dice: [1, 2] });
    expect(after.log).toContainEqual({ type: 'passedStart', player: 0, amount: 4_000_000 });
  });

  it('Mùa gió Lào: no building', () => {
    const s = newGame();
    s.ownership[1] = { owner: 0, houses: 0, mortgaged: false };
    s.ownership[3] = { owner: 0, houses: 0, mortgaged: false };
    expect(canBuildHouse(s, 1)).toBe(true);
    s.festival = { id: 'gioLao', group: null };
    expect(canBuildHouse(s, 1)).toBe(false);
  });

  it('Đền Chiêu Trưng: everyone gets lucky money', () => {
    // The festival is picked by the game's seeded random numbers: find a seed that brings this one.
    let at3: GameState | null = null;
    for (let seed = 1; seed < 200 && at3?.festival?.id !== 'chieuTrung'; seed++) {
      const s = createGame({ players: PLAYERS.map((p) => ({ ...p })), seed, rules: { mode: { kind: 'classic' }, festivals: true } });
      at3 = toRound(s, 3);
    }
    expect(at3?.festival?.id).toBe('chieuTrung');
    expect(at3!.log).toContainEqual({ type: 'festivalGift', amount: FESTIVAL_GIFT });
    expect(at3!.players.map((p) => p.cash)).toEqual([16_000_000, 16_000_000]);
  });
});

describe('stats', () => {
  it('count rent, purchases, doubles and jail', () => {
    let s = newGame();
    s.ownership[3] = { owner: 1, houses: 0, mortgaged: false }; // Lò kẹo cu đơ, rent 40k
    s = play(s, { type: 'ROLL', dice: [1, 2] }); // Đăng lands on it and pays
    expect(s.stats[0].rentPaid).toBe(40_000);
    expect(s.stats[1].rentReceived).toBe(40_000);
    s = play(s, { type: 'END_TURN' }, { type: 'ROLL', dice: [3, 3] }); // Lan: doubles, lands on 6 (light blue)
    expect(s.stats[1].doubles).toBe(1);
    s = play(s, { type: 'BUY' });
    expect(s.stats[1].bought).toBe(1);
  });

  it('give each title to the single leader of its stat', () => {
    const s = newGame();
    s.stats[0].rentReceived = 500_000;
    s.stats[1].rentReceived = 200_000;
    s.stats[0].doubles = 2;
    s.stats[1].doubles = 2; // a tie: nobody is "Lord of Doubles"
    expect(awards(s)).toEqual([{ title: 'rentKing', player: 0, value: 500_000 }]);
  });
});

describe('saves', () => {
  it('keep the game mode, round, festival and stats', () => {
    let s = newGame({ mode: { kind: 'rounds', rounds: 10 }, festivals: true });
    s = endTurn(endTurn(s));
    expect(parseSave(serializeGame(s))?.game).toEqual(s);
  });

  it('load games saved before game modes as classic games', () => {
    const old = structuredClone(newGame()) as unknown as Record<string, unknown>;
    for (const key of ['rules', 'round', 'festival', 'stats', 'worth', 'endReason']) delete old[key];
    const text = JSON.stringify({ version: SAVE_VERSION, savedAt: '2026-10-18T12:00:00Z', game: old });
    const game = parseSave(text)?.game;
    expect(game?.rules).toEqual({ mode: { kind: 'classic' }, festivals: false });
    expect(game?.round).toBe(1);
    expect(game?.stats).toHaveLength(2);
  });
});

describe('more festivals', () => {
  const firstOf = (kind: string, from = 0) => BOARD.findIndex((s, i) => i >= from && s.kind === kind);
  const beach = BOARD.findIndex((s) => s.name.vi === 'Biển Cửa Lò');

  /** Lan owns `space`; Đăng lands on it (from 3 spaces before, rolling 1 + 2). Returns the rent paid. */
  function rentOn(space: number, festival: GameState['festival']): number {
    const s = newGame();
    s.ownership[space] = { owner: 1, houses: 0, mortgaged: false };
    s.players[0].position = space - 3;
    s.festival = festival;
    return play(s, { type: 'ROLL', dice: [1, 2] }).stats[0].rentPaid;
  }

  it('Cửa Lò: rent ×2 on the beaches only', () => {
    expect(rentOn(beach, { id: 'cuaLo', group: null })).toBe(2 * rentOn(beach, null));
    expect(rentOn(6, { id: 'cuaLo', group: null })).toBe(rentOn(6, null));
  });

  it('Mùa cưới: transport rent ×2; Nắng nóng: utility rent ×2', () => {
    const transport = firstOf('transport');
    const utility = firstOf('utility');
    expect(rentOn(transport, { id: 'muaCuoi', group: null })).toBe(2 * rentOn(transport, null));
    expect(rentOn(utility, { id: 'nangNong', group: null })).toBe(2 * rentOn(utility, null));
  });

  it('Mùa mưa bão: all rent halved', () => {
    expect(rentOn(6, { id: 'muaBao', group: null })).toBe(rentOn(6, null) / 2);
  });

  it('Chợ phiên: houses cost half', () => {
    const s = newGame();
    s.ownership[1] = { owner: 0, houses: 0, mortgaged: false };
    s.ownership[3] = { owner: 0, houses: 0, mortgaged: false };
    s.festival = { id: 'choPhien', group: null };
    const built = play(s, { type: 'BUILD_HOUSE', space: 1 });
    expect(s.players[0].cash - built.players[0].cash).toBe(250_000); // a 500k house
  });

  it('Mùa lúa chín: lifting a mortgage costs no interest', () => {
    const s = newGame();
    s.ownership[3] = { owner: 0, houses: 0, mortgaged: true }; // 600k: loan 300k
    const normal = play(s, { type: 'UNMORTGAGE', space: 3 });
    s.festival = { id: 'luaChin', group: null };
    const harvest = play(s, { type: 'UNMORTGAGE', space: 3 });
    expect(s.players[0].cash - normal.players[0].cash).toBe(330_000);
    expect(s.players[0].cash - harvest.players[0].cash).toBe(300_000);
  });

  it('Hội vật làng: doubles win a prize', () => {
    const s = newGame();
    s.festival = { id: 'hoiVat', group: null };
    const after = play(s, { type: 'ROLL', dice: [2, 2] });
    expect(after.log).toContainEqual({ type: 'festivalBonus', player: 0, amount: 500_000, reason: 'doubles' });
  });

  it('Năm được mùa: no tax', () => {
    const tax = firstOf('tax');
    const s = newGame();
    s.players[0].position = tax - 3;
    s.festival = { id: 'duocMua', group: null };
    const after = play(s, { type: 'ROLL', dice: [1, 2] });
    expect(after.players[0].cash).toBe(15_000_000);
    expect(after.log).toContainEqual({ type: 'festivalTaxFree', player: 0, space: tax });
  });

  it('Đền Hồng Sơn: drawing a card comes with a prize', () => {
    const card = firstOf('card', 3);
    const s = newGame();
    s.players[0].position = card - 3;
    s.festival = { id: 'hongSon', group: null };
    const after = play(s, { type: 'ROLL', dice: [1, 2] });
    expect(after.log).toContainEqual({ type: 'festivalBonus', player: 0, amount: 500_000, reason: 'card' });
  });

  /**
   * Plays two-player games with festivals to the start of round 3, trying seeds until that round's
   * festival is `id`; `prepare` sets things up just before (e.g. someone in jail).
   */
  function round3With(id: string, prepare: (s: GameState) => void): GameState {
    for (let seed = 1; seed < 1000; seed++) {
      let s = createGame({ players: PLAYERS.map((p) => ({ ...p })), seed, rules: { mode: { kind: 'classic' }, festivals: true } });
      s = endTurn(endTurn(s)); // round 2
      s = endTurn(s);
      prepare(s);
      s = endTurn(s); // round 3 starts
      if (s.festival?.id === id) return s;
    }
    throw new Error(`no seed brings ${id}`);
  }

  it('Lễ ân xá: everyone in jail is set free', () => {
    const s = round3With('anXa', (g) => {
      g.players[1].inJail = true;
      g.players[1].jailAttempts = 2;
    });
    expect(s.players[1].inJail).toBe(false);
    expect(s.log).toContainEqual({ type: 'festivalAmnesty', players: [1] });
  });

  it('Góp tiền sửa đình làng: everyone gives 500k, or what they have', () => {
    const s = round3With('dongGop', (g) => (g.players[1].cash = 200_000));
    expect(s.players.map((p) => p.cash)).toEqual([14_500_000, 0]);
    expect(s.log).toContainEqual({ type: 'festivalLevy', total: 700_000 });
  });

  it('Tương thân tương ái: everyone helps the poorest player', () => {
    const s = round3With('tuongThan', (g) => (g.players[1].cash = 1_000_000));
    expect(s.players.map((p) => p.cash)).toEqual([14_700_000, 1_300_000]);
    expect(s.log).toContainEqual({ type: 'festivalShare', to: 1, total: 300_000 });
  });

  it('every festival has a name and an effect in every language', () => {
    for (const lang of ['vi', 'nghe', 'en'] as const) {
      for (const id of FESTIVALS) {
        expect(STRINGS[lang].festivalNames[id]).toBeTruthy();
        expect(festivalText({ id, group: 'red' }, lang)).toBeTruthy();
      }
    }
    expect(FESTIVALS).toHaveLength(16);
  });
});
