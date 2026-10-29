import { describe, expect, it } from 'vitest';
import { applyAction, CLASSIC_RULES, createGame, NO_VIET } from '../src/engine/game';
import { dealMissions, MISSION_IDS, MISSION_REWARD, MISSIONS_EACH, type MissionId } from '../src/engine/missions';
import { parseSave, serializeGame } from '../src/engine/save';
import type { GameState } from '../src/engine/types';
import { join, newRoom, start, view, type Randomness, type RoomState } from '../server/room';
import { badgesEarned } from '../src/ui/records';

const TR = 1_000_000;
const WITH_MISSIONS = { ...CLASSIC_RULES, viet: { ...NO_VIET, missions: true } };

function newGame(missions?: MissionId[][]): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
    ],
    seed: 9,
    rules: WITH_MISSIONS,
    missions,
  });
}

const change = (s: GameState, f: (s: GameState) => void) => {
  const c = structuredClone(s);
  f(c);
  return c;
};

describe('dealing', () => {
  it('gives each player two different missions, nobody sharing one', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const dealt = dealMissions(4, seed);
      expect(dealt.every((m) => m.length === MISSIONS_EACH)).toBe(true);
      expect(new Set(dealt.flat()).size).toBe(4 * MISSIONS_EACH);
      expect(dealt.flat().every((m) => MISSION_IDS.includes(m))).toBe(true);
    }
    expect(dealMissions(2, 7)).toEqual(dealMissions(2, 7));
  });

  it('only with the rule on: a classic game has no missions and the same dice', () => {
    const classic = createGame({ players: [{ name: 'A', token: 'nonLa' }, { name: 'B', token: 'conTrau' }], seed: 9 });
    expect(classic.players.every((p) => p.missions === undefined)).toBe(true);
    expect(newGame().players.every((p) => p.missions?.length === MISSIONS_EACH)).toBe(true);
  });
});

describe('finishing a mission', () => {
  it('pays the reward once, the moment it is done, and says so', () => {
    const g = change(newGame([['powerWater', 'rich'], ['laps3', 'doubles3']]), (s) => {
      s.ownership[12] = { owner: 0, houses: 0, mortgaged: false };
      s.ownership[28] = { owner: 0, houses: 0, mortgaged: false };
      s.phase = { kind: 'awaitEndTurn' };
    });
    const after = applyAction(g, { type: 'END_TURN' });
    expect(after.players[0].missions?.[0]).toEqual({ id: 'powerWater', done: true });
    expect(after.players[0].cash).toBe(g.players[0].cash + MISSION_REWARD);
    expect(after.log.filter((e) => e.type === 'missionDone')).toEqual([{ type: 'missionDone', player: 0, mission: 'powerWater', reward: MISSION_REWARD }]);
    // Still true next move: not paid again.
    const next = applyAction(change(after, (s) => (s.phase = { kind: 'awaitEndTurn' })), { type: 'END_TURN' });
    expect(next.players[0].cash).toBe(after.players[0].cash);
  });

  it('credits making someone bankrupt to whoever was owed', () => {
    const g = change(newGame([['laps3', 'rich'], ['bankruptSomeone', 'doubles3']]), (s) => {
      s.phase = { kind: 'inDebt', debtor: 0, creditor: 1, amount: 99 * TR, reason: { kind: 'rent', space: 39 } };
    });
    const after = applyAction(g, { type: 'DECLARE_BANKRUPTCY' });
    // The game ends there, so the check doesn't run on the final move; check a 3-player game instead.
    expect(after.phase.kind).toBe('gameOver');
    const three = createGame({
      players: [
        { name: 'Đăng', token: 'nonLa' },
        { name: 'Lan', token: 'conTrau' },
        { name: 'Minh', token: 'quaCam' },
      ],
      seed: 9,
      rules: WITH_MISSIONS,
      missions: [['laps3', 'rich'], ['bankruptSomeone', 'doubles3'], ['builder', 'vinh2']],
    });
    const owing = change(three, (s) => (s.phase = { kind: 'inDebt', debtor: 0, creditor: 1, amount: 99 * TR, reason: { kind: 'rent', space: 39 } }));
    const done = applyAction(owing, { type: 'DECLARE_BANKRUPTCY' });
    expect(done.players[1].missions?.[0]).toEqual({ id: 'bankruptSomeone', done: true });
  });

  it('players out of the game finish nothing', () => {
    const g = change(newGame([['rich', 'laps3'], ['doubles3', 'builder']]), (s) => {
      s.players[0].bankrupt = true;
      s.players[0].cash = 30 * TR;
      s.current = 1;
      s.phase = { kind: 'awaitEndTurn' };
    });
    expect(applyAction(g, { type: 'END_TURN' }).players[0].missions?.[0].done).toBe(false);
  });

  it('two missions done in a game earn the Điệp viên badge', () => {
    const g = change(newGame([['rich', 'laps3'], ['doubles3', 'builder']]), (s) => {
      s.players[0].missions = [
        { id: 'rich', done: true },
        { id: 'laps3', done: true },
      ];
      s.phase = { kind: 'gameOver', winner: 0 };
    });
    expect(badgesEarned(g, 0)).toContain('agent');
    expect(badgesEarned(g, 1)).not.toContain('agent');
  });

  it('saves and loads with the missions', () => {
    const g = newGame([['rich', 'laps3'], ['doubles3', 'builder']]);
    expect(parseSave(serializeGame(g))?.game.players[1].missions).toEqual(g.players[1].missions);
  });
});

describe('secret online', () => {
  function startedRoom(): RoomState {
    let k = 0;
    const random: Randomness = { die: () => 1, seed: () => 1234, key: () => `key-${k++}` };
    let { room } = newRoom('ABC234', { name: 'Đăng', token: 'nonLa', color: 'red' }, random);
    const joined = join(room, { name: 'Lan', token: 'conTrau', color: 'indigo' }, random);
    if (!joined.ok) throw new Error(joined.error);
    room = joined.value.room;
    const started = start(room, 0, 15 * TR, 'inOrder', random, WITH_MISSIONS);
    if (!started.ok) throw new Error(started.error);
    return started.value;
  }

  it('the room deals the missions with its own randomness', () => {
    const room = startedRoom();
    expect(room.game?.players.map((p) => p.missions?.length)).toEqual([MISSIONS_EACH, MISSIONS_EACH]);
    expect(room.game?.players[0].missions?.map((m) => m.id)).toEqual(dealMissions(2, 1234)[0]);
  });

  it('each phone sees its own missions, and only the others’ finished ones', () => {
    const room = startedRoom();
    room.game!.players[1].missions![0].done = true;
    const dang = view(room, 0, new Set([0, 1])).game!;
    expect(dang.players[0].missions?.every((m) => m.id !== null)).toBe(true);
    expect(dang.players[1].missions?.[0].id).not.toBeNull(); // finished: public
    expect(dang.players[1].missions?.[1]).toEqual({ id: null, done: false }); // still secret
    const watcher = view(room, null, new Set([0, 1])).game!;
    expect(watcher.players[0].missions?.every((m) => m.id === null)).toBe(true);
  });

  it('reveals everything once the game is over', () => {
    const room = startedRoom();
    room.game!.phase = { kind: 'gameOver', winner: 0 };
    expect(view(room, 0, new Set([0, 1])).game!.players[1].missions?.every((m) => m.id !== null)).toBe(true);
  });
});

describe('moves never change the game they started from', () => {
  it('finishing a mission leaves the previous state untouched (React may run a move twice)', () => {
    const g = change(newGame([['powerWater', 'rich'], ['laps3', 'doubles3']]), (s) => {
      s.ownership[12] = { owner: 0, houses: 0, mortgaged: false };
      s.ownership[28] = { owner: 0, houses: 0, mortgaged: false };
      s.phase = { kind: 'awaitEndTurn' };
    });
    const before = structuredClone(g);
    const first = applyAction(g, { type: 'END_TURN' });
    expect(g).toEqual(before);
    // Running the same move again gives the same result: reward and announcement included.
    expect(applyAction(g, { type: 'END_TURN' })).toEqual(first);
  });
});
