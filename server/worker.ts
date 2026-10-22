// The online room server on Cloudflare: a Worker that sends each phone's WebSocket to its room,
// and one Durable Object per room that keeps the room (see room.ts) and talks to the phones.

import { DurableObject } from 'cloudflare:workers';
import { isReactionId, isRoomCode, MAX_MESSAGE_BYTES, type ErrorCode, type ServerMessage } from '../src/net/protocol';
import * as Room from './room';
import type { RoomState } from './room';

interface Env {
  ROOMS: DurableObjectNamespace<GameRoom>;
  ALLOWED_ORIGINS: string; // comma-separated web addresses allowed to connect
}

/** What a connection remembers, kept with the socket so it survives the room going to sleep. */
interface Connection {
  code: string;
  key: string | null; // the seat key once this phone has a seat
  watching: boolean; // gets room updates (after look, create, join or rejoin)
  windowStart: number; // for the message rate limit
  count: number;
  lastReaction?: number; // reactions: at most one every REACTION_GAP_MS
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONNECTIONS = 12;
const RATE_WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 40;
const REACTION_GAP_MS = 1_200;

/** Dice, seeds and seat keys from the platform's secure random numbers. */
const RANDOM: Room.Randomness = {
  die: () => {
    const byte = new Uint8Array(1);
    do crypto.getRandomValues(byte);
    while (byte[0] >= 252); // 252 = 6 × 42, so every face is equally likely
    return (byte[0] % 6) + 1;
  },
  seed: () => crypto.getRandomValues(new Uint32Array(1))[0],
  key: () => crypto.randomUUID(),
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') return new Response('Dangopoly room server\n');
    const code = url.pathname.match(/^\/room\/([A-Z0-9]+)$/)?.[1];
    if (!code || !isRoomCode(code)) return new Response('Not found\n', { status: 404 });
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket\n', { status: 426 });
    // Browsers say which site opened the connection: only the game's own pages may.
    const origin = request.headers.get('Origin');
    if (origin && !env.ALLOWED_ORIGINS.split(',').includes(origin)) return new Response('Forbidden\n', { status: 403 });
    return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
  },
} satisfies ExportedHandler<Env>;

export class GameRoom extends DurableObject<Env> {
  private room: RoomState | null | undefined; // undefined until loaded from storage

  async fetch(request: Request): Promise<Response> {
    if (this.ctx.getWebSockets().length >= MAX_CONNECTIONS) return new Response('Room busy\n', { status: 429 });
    const code = new URL(request.url).pathname.split('/')[2];
    const [client, server] = Object.values(new WebSocketPair());
    // Hibernation API: the room can sleep between messages without dropping the phones.
    this.ctx.acceptWebSocket(server);
    const connection: Connection = { code, key: null, watching: false, windowStart: Date.now(), count: 0 };
    server.serializeAttachment(connection);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    const conn = ws.deserializeAttachment() as Connection;
    const now = Date.now();
    if (now - conn.windowStart > RATE_WINDOW_MS) Object.assign(conn, { windowStart: now, count: 0 });
    conn.count++;
    ws.serializeAttachment(conn);
    if (conn.count > MAX_MESSAGES_PER_WINDOW) return this.error(ws, 'tooFast');

    if (typeof data !== 'string' || data.length > MAX_MESSAGE_BYTES) return this.error(ws, 'badMessage');
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data);
    } catch {
      return this.error(ws, 'badMessage');
    }
    if (typeof msg !== 'object' || msg === null) return this.error(ws, 'badMessage');

    const room = await this.load();
    const seat = room && conn.key ? Room.seatOfKey(room, conn.key) : null;

    switch (msg.t) {
      case 'create': {
        if (room) return this.error(ws, 'codeTaken');
        const profile = Room.cleanProfile(msg.profile);
        if (!profile) return this.error(ws, 'badProfile');
        const created = Room.newRoom(conn.code, profile, RANDOM);
        await this.save(created.room);
        return this.seated(ws, conn, created.key);
      }
      case 'look':
        if (!room) return this.error(ws, 'noRoom');
        ws.serializeAttachment({ ...conn, watching: true });
        return this.send(ws, { t: 'room', room: Room.view(room, seat, this.online()) });
      case 'join': {
        if (!room) return this.error(ws, 'noRoom');
        if (seat !== null) return this.error(ws, 'badMessage'); // already has a seat
        const profile = Room.cleanProfile(msg.profile);
        if (!profile) return this.error(ws, 'badProfile');
        const joined = Room.join(room, profile, RANDOM);
        if (!joined.ok) return this.error(ws, joined.error);
        await this.save(joined.value.room);
        return this.seated(ws, conn, joined.value.key);
      }
      case 'rejoin': {
        if (!room) return this.error(ws, 'noRoom');
        if (typeof msg.key !== 'string' || Room.seatOfKey(room, msg.key) === null) return this.error(ws, 'badSeatKey');
        return this.seated(ws, conn, msg.key);
      }
      case 'profile': {
        const profile = Room.cleanProfile(msg.profile);
        if (!room || seat === null || !profile) return this.error(ws, profile ? 'badMessage' : 'badProfile');
        return this.apply(ws, Room.changeProfile(room, seat, profile));
      }
      case 'leave': {
        if (!room || seat === null) return this.error(ws, 'badMessage');
        const left = Room.leave(room, seat);
        if (!left.ok) return this.error(ws, left.error);
        ws.serializeAttachment({ ...conn, key: null });
        await this.save(left.value);
        return this.broadcast();
      }
      case 'start':
        if (!room || seat === null) return this.error(ws, 'badMessage');
        return this.apply(
          ws,
          Room.start(room, seat, msg.startingCash, msg.firstTurn === 'roll' ? 'roll' : 'inOrder', RANDOM, msg.rules ?? undefined, Date.now()),
        );
      case 'act':
        if (!room || seat === null) return this.error(ws, 'badMessage');
        return this.apply(ws, Room.act(room, seat, msg.action, Date.now()));
      case 'rematch':
        if (!room || seat === null) return this.error(ws, 'badMessage');
        return this.apply(ws, Room.rematch(room, seat));
      case 'react': {
        // Not stored: just passed on to every phone in the room, the sender's too.
        if (!room || seat === null || !isReactionId(msg.reaction)) return this.error(ws, 'badMessage');
        if (conn.lastReaction && now - conn.lastReaction < REACTION_GAP_MS) return this.error(ws, 'tooFast');
        ws.serializeAttachment({ ...(ws.deserializeAttachment() as Connection), lastReaction: now });
        for (const other of this.ctx.getWebSockets()) {
          if ((other.deserializeAttachment() as Connection).watching) this.send(other, { t: 'reaction', seat, reaction: msg.reaction });
        }
        return;
      }
      default:
        return this.error(ws, 'badMessage');
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    try {
      ws.close(1000, 'Bye'); // finish the closing handshake
    } catch {
      // already closed
    }
    ws.serializeAttachment({ ...(ws.deserializeAttachment() as Connection), key: null, watching: false });
    await this.load();
    this.broadcast(); // the others now see this player as offline
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }

  /** Rooms nobody has touched for a week are deleted. */
  async alarm(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'Room closed');
    await this.save(null);
  }

  // -------------------------------------------------------------------------

  private async load(): Promise<RoomState | null> {
    if (this.room === undefined) this.room = (await this.ctx.storage.get<RoomState>('room')) ?? null;
    return this.room;
  }

  private async save(room: RoomState | null): Promise<void> {
    this.room = room;
    if (room) {
      await this.ctx.storage.put('room', room);
      await this.ctx.storage.setAlarm(Date.now() + WEEK_MS);
    } else {
      await this.ctx.storage.deleteAll();
    }
  }

  private async apply(ws: WebSocket, result: Room.Result<RoomState>): Promise<void> {
    if (!result.ok) return this.error(ws, result.error);
    await this.save(result.value);
    this.broadcast();
  }

  /** This phone now has the seat with `key`: tell it, then show everyone the room. */
  private seated(ws: WebSocket, conn: Connection, key: string): void {
    ws.serializeAttachment({ ...conn, key, watching: true });
    const seat = Room.seatOfKey(this.room!, key)!;
    this.send(ws, { t: 'welcome', seat, key });
    this.broadcast();
  }

  /** Seats with a phone connected right now. */
  private online(): Set<number> {
    const seats = new Set<number>();
    if (!this.room) return seats;
    for (const ws of this.ctx.getWebSockets()) {
      const { key } = ws.deserializeAttachment() as Connection;
      const seat = key ? Room.seatOfKey(this.room, key) : null;
      if (seat !== null) seats.add(seat);
    }
    return seats;
  }

  private broadcast(): void {
    const room = this.room;
    if (!room) return;
    const online = this.online();
    for (const ws of this.ctx.getWebSockets()) {
      const { key, watching } = ws.deserializeAttachment() as Connection;
      if (!watching) continue;
      const seat = key ? Room.seatOfKey(room, key) : null;
      this.send(ws, { t: 'room', room: Room.view(room, seat, online) });
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // the phone has gone; webSocketClose will tidy up
    }
  }

  private error(ws: WebSocket, code: ErrorCode): void {
    this.send(ws, { t: 'error', code });
  }
}
