// The public room list, kept by one Durable Object (RoomDirectory in worker.ts): every room reports
// its listing when something people can see changes. Plain TypeScript, tested like room.ts.

import type { RoomListing } from '../src/net/protocol';

/** A listing nobody has refreshed for this long is dropped (its room went quiet or went away). */
export const STALE_MS = 2 * 60 * 60 * 1000;
/** At most this many rooms are shown. */
export const MAX_LISTED = 50;

const STAGE_ORDER: Record<RoomListing['stage'], number> = { lobby: 0, playing: 1, over: 2 };

/**
 * The rooms to show, freshest first within each group: rooms waiting for players (with a free
 * seat first), then games being played, then finished ones.
 */
export function visibleRooms(entries: Iterable<RoomListing>, now: number, maxPlayers = 4): RoomListing[] {
  return [...entries]
    .filter((r) => now - r.updatedAt < STALE_MS)
    .sort((a, b) => {
      const full = (r: RoomListing) => (r.stage === 'lobby' && r.players.length >= maxPlayers ? 1 : 0);
      return STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage] || full(a) - full(b) || b.updatedAt - a.updatedAt;
    })
    .slice(0, MAX_LISTED);
}

/** What a room's listing looks like for "has anything changed?" (the time it was sent doesn't count). */
export function listingKey(listing: RoomListing | null): string {
  if (!listing) return 'none';
  const { updatedAt: _, ...rest } = listing;
  return JSON.stringify(rest);
}
