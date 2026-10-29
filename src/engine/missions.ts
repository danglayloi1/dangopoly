// Secret missions (Chế độ Việt): each player gets two hidden goals; finishing one pays a reward and
// reveals it. Pure functions, tested; the room server hides others' missions online (server/room.ts).

import { BOARD, GROUP_SPACES } from '../data/board';
import { nextUint32 } from './rng';
import type { GameState, LogEntry, Player } from './types';

export type MissionId =
  | 'haTinh3'
  | 'ngheAn3'
  | 'vinh2'
  | 'beaches2'
  | 'powerWater'
  | 'transport2'
  | 'fullSet'
  | 'builder'
  | 'bankruptSomeone'
  | 'laps3'
  | 'rich'
  | 'rentCollector'
  | 'doubles3'
  | 'jailTwice';

export const MISSION_IDS: readonly MissionId[] = [
  'haTinh3',
  'ngheAn3',
  'vinh2',
  'beaches2',
  'powerWater',
  'transport2',
  'fullSet',
  'builder',
  'bankruptSomeone',
  'laps3',
  'rich',
  'rentCollector',
  'doubles3',
  'jailTwice',
];

/** Missions per player, and what finishing one pays. */
export const MISSIONS_EACH = 2;
export const MISSION_REWARD = 3_000_000;

const TR = 1_000_000;
const BRIDGE = BOARD.findIndex((s) => s.kind === 'rest'); // Cầu Bến Thủy: Hà Tĩnh before it, Nghệ An after
const named = (...names: string[]) => names.map((n) => BOARD.findIndex((s) => s.name.vi === n));
const VINH = named('Ga Vinh', 'Chợ Vinh', 'Đại học Vinh', 'Công viên trung tâm Vinh', 'Sân bay Vinh', 'Sân vận động Vinh (SLNA)', 'Đường Quang Trung');
const BEACHES = BOARD.flatMap((s, i) => (s.name.vi.startsWith('Biển ') ? [i] : []));

const owned = (s: GameState, p: number) => Object.keys(s.ownership).map(Number).filter((i) => s.ownership[i].owner === p);
const count = (s: GameState, p: number, spaces: readonly number[]) => owned(s, p).filter((i) => spaces.includes(i)).length;
const ofKind = (s: GameState, p: number, kind: 'transport' | 'utility') => owned(s, p).filter((i) => BOARD[i].kind === kind).length;

/** Whether `p` has done the mission now; `fresh` is what the last move added to the log. */
const CHECKS: Record<MissionId, (s: GameState, p: number, fresh: readonly LogEntry[]) => boolean> = {
  haTinh3: (s, p) => owned(s, p).filter((i) => i < BRIDGE).length >= 3,
  ngheAn3: (s, p) => owned(s, p).filter((i) => i > BRIDGE).length >= 3,
  vinh2: (s, p) => count(s, p, VINH) >= 2,
  beaches2: (s, p) => count(s, p, BEACHES) >= 2,
  powerWater: (s, p) => ofKind(s, p, 'utility') >= 2,
  transport2: (s, p) => ofKind(s, p, 'transport') >= 2,
  fullSet: (s, p) => Object.values(GROUP_SPACES).some((spaces) => spaces.every((i) => s.ownership[i]?.owner === p)),
  builder: (s, p) => owned(s, p).reduce((n, i) => n + s.ownership[i].houses, 0) >= 3,
  bankruptSomeone: (_s, p, fresh) => fresh.some((e) => e.type === 'bankrupt' && e.creditor === p),
  laps3: (s, p) => s.stats[p].laps >= 3,
  rich: (s, p) => s.players[p].cash >= 25 * TR,
  rentCollector: (s, p) => s.stats[p].rentReceived >= 5 * TR,
  doubles3: (s, p) => s.stats[p].doubles >= 3,
  jailTwice: (s, p) => s.stats[p].jailed >= 2,
};

/**
 * Deals MISSIONS_EACH different missions to each of `players`, nobody sharing one (there are enough
 * for four players). The seed is separate from the game's dice: online the room deals with its own
 * secure randomness, so nobody can work the missions out from the game's random numbers.
 */
export function dealMissions(players: number, seed: number): MissionId[][] {
  const pool = [...MISSION_IDS];
  let state = seed >>> 0;
  for (let i = pool.length - 1; i > 0; i--) {
    const [r, next] = nextUint32(state);
    state = next;
    const j = r % (i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return Array.from({ length: players }, (_, p) => pool.slice(p * MISSIONS_EACH, (p + 1) * MISSIONS_EACH));
}

/**
 * After a move: any mission it finished is marked done, paid and announced in the log. `fresh` is
 * what the move added to the log. Players out of the game finish nothing.
 */
export function checkMissions(s: GameState, fresh: readonly LogEntry[]): void {
  for (const player of s.players) {
    if (player.bankrupt || !player.missions) continue;
    for (const slot of player.missions) {
      if (slot.done || slot.id === null || !CHECKS[slot.id](s, player.id, fresh)) continue;
      slot.done = true;
      player.cash += MISSION_REWARD;
      s.log.push({ type: 'missionDone', player: player.id, mission: slot.id, reward: MISSION_REWARD });
    }
  }
}

/** Missions finished by a player (for "🎯 1/2"). */
export const missionsDone = (p: Player): number => p.missions?.filter((m) => m.done).length ?? 0;
