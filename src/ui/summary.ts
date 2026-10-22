// The end-of-game summary: who earned which title, from the stats counted during the game.

import type { GameState, PlayerStats } from '../engine/types';

export type TitleId = 'rentKing' | 'landlord' | 'builder' | 'generous' | 'luckyDice' | 'jailRegular' | 'trader' | 'traveller';

/** Each title goes to whoever has the most of one stat. */
const TITLE_STATS: Record<TitleId, keyof PlayerStats> = {
  rentKing: 'rentReceived',
  landlord: 'bought',
  builder: 'housesBuilt',
  generous: 'rentPaid',
  luckyDice: 'doubles',
  jailRegular: 'jailed',
  trader: 'trades',
  traveller: 'laps',
};

export interface Award {
  title: TitleId;
  player: number;
  value: number;
}

/**
 * The titles earned: one per stat, to the single player with the most of it. Nobody gets a title
 * for a stat that's 0 for everyone or a tie at the top, so every title means something.
 */
export function awards(game: GameState): Award[] {
  const result: Award[] = [];
  for (const [title, stat] of Object.entries(TITLE_STATS) as [TitleId, keyof PlayerStats][]) {
    const values = game.stats.map((s) => s[stat]);
    const best = Math.max(...values);
    if (best <= 0) continue;
    const leaders = values.flatMap((v, player) => (v === best ? [player] : []));
    if (leaders.length === 1) result.push({ title, player: leaders[0], value: best });
  }
  return result;
}
