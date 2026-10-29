import { describe, expect, it } from 'vitest';
import { botAction } from '../src/engine/bot';
import { applyAction, CLASSIC_RULES, createGame, legalActions, NO_VIET } from '../src/engine/game';
import { BUFFALO_FEE, BUFFALO_RIDE, BUFFALO_SPACES, isRushHour, JAM_SPACES, jamOnPath, XE_OM_FEE } from '../src/engine/roads';
import type { GameState, VietRules } from '../src/engine/types';
import { cleanAction } from '../server/room';

// Jam spots: 5 Bến xe Hà Tĩnh, 20 Cầu Bến Thủy, 31 Chợ Vinh.
const TR = 1_000_000;

function newGame(viet: Partial<VietRules>, bot = false): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa', ...(bot ? { bot: 'normal' as const } : {}) },
      { name: 'Lan', token: 'conTrau' },
    ],
    seed: 21,
    rules: { ...CLASSIC_RULES, viet: { ...NO_VIET, ...viet } },
  });
}

const change = (s: GameState, f: (s: GameState) => void) => {
  const c = structuredClone(s);
  f(c);
  return c;
};

describe('rush-hour traffic', () => {
  it('is rush hour two rounds in four, with the rule on', () => {
    const g = newGame({ traffic: true });
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((round) => isRushHour({ ...g, round }))).toEqual([false, true, true, false, false, true, true, false]);
    expect(isRushHour({ ...newGame({}), round: 2 })).toBe(false);
  });

  it('a jam is a spot passed through, not the one landed on', () => {
    expect(JAM_SPACES).toEqual([5, 20, 31]);
    expect(jamOnPath(0, 7)).toBe(5);
    expect(jamOnPath(0, 5)).toBeNull(); // lands on it
    expect(jamOnPath(36, 10)).toBe(5); // round the corner, on to space 6
  });

  /** Đăng on Xuất phát at rush hour, about to roll 2 + 4: through Bến xe Hà Tĩnh to Suối nước nóng Sơn Kim (6). */
  const rushHour = (cash = 15 * TR) =>
    change(newGame({ traffic: true }), (s) => {
      s.round = 2;
      s.players[0].cash = cash;
    });

  it('stops the move at the jam, with the steps still to go', () => {
    const s = applyAction(rushHour(), { type: 'ROLL', dice: [2, 4] });
    expect(s.players[0].position).toBe(5);
    expect(s.phase).toEqual({ kind: 'inJam', space: 5, remaining: 1 });
    expect(legalActions(s)).toEqual(['XE_OM', 'WAIT_IN_JAM']);
  });

  it('a xe ôm costs 300k and goes the rest of the way', () => {
    const s = applyAction(applyAction(rushHour(), { type: 'ROLL', dice: [2, 4] }), { type: 'XE_OM' });
    expect(s.players[0].position).toBe(6);
    expect(s.players[0].cash).toBe(15 * TR - XE_OM_FEE);
  });

  it('waiting leaves you on the jam spot, landing there as usual', () => {
    const s = applyAction(applyAction(rushHour(), { type: 'ROLL', dice: [2, 4] }), { type: 'WAIT_IN_JAM' });
    expect(s.players[0].position).toBe(5);
    expect(s.phase).toEqual({ kind: 'awaitBuy', space: 5 }); // Bến xe Hà Tĩnh is for sale
  });

  it('no xe ôm without the money, and no jam outside rush hour', () => {
    expect(legalActions(applyAction(rushHour(100_000), { type: 'ROLL', dice: [2, 4] }))).toEqual(['WAIT_IN_JAM']);
    const quiet = change(rushHour(), (s) => (s.round = 1));
    expect(applyAction(quiet, { type: 'ROLL', dice: [2, 4] }).players[0].position).toBe(6);
  });
});

describe('the wandering buffalo', () => {
  /** Plays END_TURN until round `round` starts. */
  const toRound = (g: GameState, round: number) => {
    let s = g;
    while (s.round < round) {
      s = change(s, (c) => (c.phase = { kind: 'awaitEndTurn' }));
      s = applyAction(s, { type: 'END_TURN' });
    }
    return s;
  };

  it('turns up now and then as a round starts, never on a corner, and wanders off the next', () => {
    let s = newGame({ buffalo: true });
    const seen: (number | null | undefined)[] = [];
    for (let round = 2; round <= 30; round++) {
      s = toRound(s, round);
      seen.push(s.buffalo);
    }
    const spots = seen.filter((b): b is number => typeof b === 'number');
    expect(spots.length).toBeGreaterThan(3);
    expect(spots.length).toBeLessThan(seen.length);
    expect(spots.every((b) => BUFFALO_SPACES.includes(b) && b % 10 !== 0)).toBe(true);
    expect(toRound(newGame({}), 10).buffalo).toBeUndefined(); // not without the rule
  });

  /** Đăng about to land on Đường Quang Trung (39) where the buffalo stands. */
  const blocked = (cash = 15 * TR) =>
    change(newGame({ buffalo: true }), (s) => {
      s.players[0].position = 32;
      s.players[0].cash = cash;
      s.buffalo = 39;
    });

  it('landing on it means dealing with it first', () => {
    const s = applyAction(blocked(), { type: 'ROLL', dice: [3, 4] });
    expect(s.phase).toEqual({ kind: 'buffalo', space: 39 });
    expect(legalActions(s)).toEqual(['LEAD_BUFFALO', 'RIDE_BUFFALO']);
    expect(legalActions(applyAction(blocked(100_000), { type: 'ROLL', dice: [3, 4] }))).toEqual(['RIDE_BUFFALO']);
  });

  it('leading it home costs 200k, then the landing goes on (Quang Trung is for sale)', () => {
    const s = applyAction(applyAction(blocked(), { type: 'ROLL', dice: [3, 4] }), { type: 'LEAD_BUFFALO' });
    expect(s.players[0].cash).toBe(15 * TR - BUFFALO_FEE);
    expect(s.buffalo).toBeNull();
    expect(s.phase).toEqual({ kind: 'awaitBuy', space: 39 });
  });

  it('riding it carries you a few spaces on, for free', () => {
    const s = applyAction(applyAction(blocked(), { type: 'ROLL', dice: [3, 4] }), { type: 'RIDE_BUFFALO' });
    const ride = s.log.find((e) => e.type === 'buffaloRide');
    expect(ride?.type === 'buffaloRide' && ride.steps).toBeGreaterThanOrEqual(BUFFALO_RIDE.min);
    expect(ride?.type === 'buffaloRide' && ride.steps).toBeLessThanOrEqual(BUFFALO_RIDE.max);
    expect(s.buffalo).toBeNull();
    expect(s.players[0].position).not.toBe(39);
  });
});

describe('bots and the server', () => {
  it('a bot with money to spare takes the xe ôm and leads the buffalo home', () => {
    const jam = change(newGame({ traffic: true }, true), (s) => (s.phase = { kind: 'inJam', space: 5, remaining: 2 }));
    expect(botAction(jam)).toEqual({ type: 'XE_OM' });
    const poor = change(jam, (s) => (s.players[0].cash = 1 * TR));
    expect(botAction(poor)).toEqual({ type: 'WAIT_IN_JAM' });
    const buffalo = change(newGame({ buffalo: true }, true), (s) => (s.phase = { kind: 'buffalo', space: 39 }));
    expect(botAction(buffalo)).toEqual({ type: 'LEAD_BUFFALO' });
  });

  it('the room accepts the four new moves', () => {
    for (const type of ['XE_OM', 'WAIT_IN_JAM', 'LEAD_BUFFALO', 'RIDE_BUFFALO'] as const) {
      expect(cleanAction({ type, steps: 99 })).toEqual({ type }); // nothing extra gets through
    }
  });
});
