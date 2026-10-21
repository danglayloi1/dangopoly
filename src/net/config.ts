// Where the room server is. While developing, it's the one started by `npm run server`;
// VITE_ROOM_SERVER overrides it (e.g. to try the deployed server from the dev site).
export const ROOM_SERVER: string =
  import.meta.env.VITE_ROOM_SERVER ?? (import.meta.env.DEV ? 'ws://localhost:8787' : 'wss://dangopoly-server.danglayloi1.workers.dev');

/** The link that opens a room, for inviting friends. */
export function roomLink(code: string): string {
  return `${location.origin}${location.pathname}?room=${code}`;
}
