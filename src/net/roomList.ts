import { PLAYER_COLOR_IDS } from '../data/colors';
import { TOKENS } from '../data/tokens';
import { ROOM_SERVER_HTTP } from './config';
import { isRoomCode, type RoomListing } from './protocol';

const TOKEN_IDS: readonly string[] = TOKENS.map((t) => t.id);
const STAGES = ['lobby', 'playing', 'over'];

/** One listing from the server, checked (anything odd is left out rather than shown). */
function isListing(v: unknown): v is RoomListing {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.code === 'string' &&
    isRoomCode(r.code) &&
    STAGES.includes(r.stage as string) &&
    typeof r.host === 'string' &&
    Array.isArray(r.players) &&
    r.players.every(
      (p) =>
        typeof p === 'object' &&
        p !== null &&
        typeof p.name === 'string' &&
        TOKEN_IDS.includes(p.token) &&
        PLAYER_COLOR_IDS.includes(p.color) &&
        typeof p.online === 'boolean',
    ) &&
    Number.isInteger(r.watchers) &&
    (r.round === null || Number.isInteger(r.round)) &&
    typeof r.updatedAt === 'number'
  );
}

/** The rooms open right now, from the room server. Throws if the server can't be reached. */
export async function fetchRoomList(signal?: AbortSignal): Promise<RoomListing[]> {
  const response = await fetch(`${ROOM_SERVER_HTTP}/rooms`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Room list: ${response.status}`);
  const data: unknown = await response.json();
  return Array.isArray(data) ? data.filter(isListing) : [];
}
