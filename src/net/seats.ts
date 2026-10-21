// The seat keys this browser holds, one per room, so a phone that reloads or comes back later
// takes its own seat again. Also the last room, offered on the start screen.

const KEY = 'dangopoly.online';
const MAX_ROOMS = 10;

interface Stored {
  rooms: Record<string, string>; // room code → seat key
  last: string | null;
}

function read(): Stored {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
    if (data && typeof data.rooms === 'object' && data.rooms !== null) return { rooms: data.rooms, last: data.last ?? null };
  } catch {
    // unreadable or blocked: start empty
  }
  return { rooms: {}, last: null };
}

function write(data: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage blocked: the seat just won't survive a reload
  }
}

export const seatKeyFor = (code: string): string | null => read().rooms[code] ?? null;

export function rememberSeat(code: string, key: string): void {
  const data = read();
  delete data.rooms[code];
  // Newest last; only the most recent rooms are kept.
  const rooms = Object.entries({ ...data.rooms, [code]: key }).slice(-MAX_ROOMS);
  write({ rooms: Object.fromEntries(rooms), last: code });
}

export function forgetSeat(code: string): void {
  const data = read();
  delete data.rooms[code];
  write({ rooms: data.rooms, last: data.last === code ? null : data.last });
}

/** The room this browser was last seated in, if it still has the key. */
export function lastRoom(): string | null {
  const data = read();
  return data.last && data.rooms[data.last] ? data.last : null;
}
