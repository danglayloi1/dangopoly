// Records on this device: for each person (by name), games played and won, best fortune, and the
// badges earned. Bots get no records. Kept in localStorage; if storage is unavailable the game
// just doesn't remember (see savedGame.ts for the same approach).

import { GROUP_SPACES } from '../data/board';
import { HOTEL } from '../engine/buildings';
import { worthOfAll } from '../engine/rounds';
import type { GameState } from '../engine/types';
import type { IconName } from './icons';

const KEY = 'dangopoly.records';
const TR = 1_000_000;

export type BadgeId =
  | 'firstWin'
  | 'veteran'
  | 'hotel'
  | 'fullSet'
  | 'landlord'
  | 'rentKing'
  | 'tycoon'
  | 'lucky'
  | 'jailbird'
  | 'trader'
  | 'festivalWin'
  | 'quickWin'
  | 'beatHard'
  | 'loneWolf'
  | 'online'
  // The silly ones: badges for bad luck, worn with pride
  | 'brokeButHappy'
  | 'unlucky'
  | 'tourist'
  | 'agent';

/** Every badge, in the order the collection shows them, with its drawing. */
export const BADGES: readonly { id: BadgeId; icon: IconName }[] = [
  { id: 'firstWin', icon: 'trophy' },
  { id: 'veteran', icon: 'medalGold' },
  { id: 'hotel', icon: 'house' },
  { id: 'fullSet', icon: 'blossom' },
  { id: 'landlord', icon: 'scroll' },
  { id: 'rentKing', icon: 'coins' },
  { id: 'tycoon', icon: 'purse' },
  { id: 'lucky', icon: 'dice' },
  { id: 'jailbird', icon: 'jail' },
  { id: 'trader', icon: 'handshake' },
  { id: 'festivalWin', icon: 'lantern' },
  { id: 'quickWin', icon: 'clock' },
  { id: 'beatHard', icon: 'bot' },
  { id: 'loneWolf', icon: 'person' },
  { id: 'online', icon: 'globe' },
  { id: 'brokeButHappy', icon: 'slipper' },
  { id: 'unlucky', icon: 'moon' },
  { id: 'tourist', icon: 'wave' },
  { id: 'agent', icon: 'scroll' },
];

export const VETERAN_GAMES = 10;

export interface PersonRecord {
  name: string; // as last written
  games: number;
  wins: number;
  bestWorth: number; // đồng, at the end of a game
  badges: Partial<Record<BadgeId, number>>; // when each was first earned (ms since 1970)
  lastPlayed: number;
}

export type Records = Record<string, PersonRecord>; // by recordKey(name)

/** Names are matched without caring about case or extra spaces: "đăng " is Đăng. */
export const recordKey = (name: string): string => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

/** The badges a finished game earns `player` by itself (not counting earlier games). */
export function badgesEarned(game: GameState, player: number, online = false): BadgeId[] {
  if (game.phase.kind !== 'gameOver') return [];
  const won = game.phase.winner === player;
  const stats = game.stats[player];
  const mine = Object.entries(game.ownership).filter(([, own]) => own.owner === player);
  const worth = worthOfAll(game)[player];
  const bots = game.players.filter((p) => p.bot);
  const badges: BadgeId[] = [];

  if (mine.some(([, own]) => own.houses >= HOTEL)) badges.push('hotel');
  if (Object.values(GROUP_SPACES).some((spaces) => spaces.every((i) => game.ownership[i]?.owner === player))) badges.push('fullSet');
  if (mine.length >= 10) badges.push('landlord');
  if (stats.rentReceived >= 10 * TR) badges.push('rentKing');
  if (!game.players[player].bankrupt && worth >= 40 * TR) badges.push('tycoon');
  if (stats.doubles >= 8) badges.push('lucky');
  if (stats.jailed >= 3) badges.push('jailbird');
  if (stats.trades >= 3) badges.push('trader');
  if (won && game.rules.festivals) badges.push('festivalWin');
  if (won && game.endReason === 'lastStanding' && game.round <= 25) badges.push('quickWin');
  if (won && bots.some((p) => p.bot === 'hard')) badges.push('beatHard');
  if (won && bots.length === 3) badges.push('loneWolf');
  if (online) badges.push('online');
  if (game.players[player].bankrupt) badges.push('brokeButHappy');
  if (stats.rentPaid >= 15 * TR) badges.push('unlucky');
  if (stats.bought === 0 && !game.players[player].bankrupt) badges.push('tourist');
  if (game.players[player].missions?.length && game.players[player].missions!.every((m) => m.done)) badges.push('agent');
  return badges;
}

/** What a finished game added for one person: the badges they hadn't earned before. */
export interface NewBadges {
  player: number;
  badges: BadgeId[];
}

/**
 * Adds a finished game to the records, for the people in `seats` (bots are skipped). Pure: returns
 * the new records and, for each person, the badges earned for the first time.
 */
export function addGame(records: Records, game: GameState, seats: readonly number[], options: { online?: boolean; now?: number } = {}): { records: Records; earned: NewBadges[] } {
  if (game.phase.kind !== 'gameOver') return { records, earned: [] };
  const now = options.now ?? Date.now();
  const worth = worthOfAll(game);
  const next: Records = { ...records };
  const earned: NewBadges[] = [];

  for (const player of seats) {
    const p = game.players[player];
    if (!p || p.bot) continue;
    const key = recordKey(p.name);
    const before = next[key] ?? { name: p.name, games: 0, wins: 0, bestWorth: 0, badges: {}, lastPlayed: now };
    const won = game.phase.winner === player;
    const record: PersonRecord = {
      name: p.name,
      games: before.games + 1,
      wins: before.wins + (won ? 1 : 0),
      bestWorth: Math.max(before.bestWorth, p.bankrupt ? 0 : worth[player]),
      badges: { ...before.badges },
      lastPlayed: now,
    };
    const all = badgesEarned(game, player, options.online);
    if (record.wins >= 1) all.push('firstWin');
    if (record.games >= VETERAN_GAMES) all.push('veteran');
    const fresh = BADGES.map((b) => b.id).filter((id) => all.includes(id) && record.badges[id] === undefined);
    for (const id of fresh) record.badges[id] = now;
    next[key] = record;
    if (fresh.length) earned.push({ player, badges: fresh });
  }
  return { records: next, earned };
}

function isRecord(v: unknown): v is PersonRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.name === 'string' &&
    Number.isInteger(r.games) &&
    Number.isInteger(r.wins) &&
    typeof r.bestWorth === 'number' &&
    typeof r.badges === 'object' &&
    r.badges !== null &&
    typeof r.lastPlayed === 'number'
  );
}

export function loadRecords(): Records {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown;
    if (typeof raw !== 'object' || raw === null) return {};
    return Object.fromEntries(Object.entries(raw).filter(([, v]) => isRecord(v))) as Records;
  } catch {
    return {};
  }
}

/** Records a finished game on this device; returns the badges earned for the first time. */
export function recordGame(game: GameState, seats: readonly number[], online = false): NewBadges[] {
  const { records, earned } = addGame(loadRecords(), game, seats, { online });
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // storage unavailable: nothing is remembered
  }
  return earned;
}

export function clearRecords(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
