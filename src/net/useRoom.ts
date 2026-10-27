import { useCallback, useEffect, useRef, useState } from 'react';
import { ROOM_SERVER } from './config';
import { RoomConnection, type ConnectionStatus } from './connection';
import type { ClientMessage, ErrorCode, ReactionId, RoomView, ThrowItem } from './protocol';
import { forgetSeat, rememberSeat, seatKeyFor } from './seats';

/** A reaction someone sent, shown for a few seconds. */
export interface ShownReaction {
  id: number;
  seat: number;
  reaction: ReactionId;
}

/** Something thrown at a player's token, shown while it flies. */
export interface ShownThrow {
  id: number;
  from: number;
  target: number;
  item: ThrowItem;
}

const THROW_SHOWN_MS = 1_800;

const REACTION_SHOWN_MS = 3_000;

export interface RoomState {
  status: ConnectionStatus;
  reactions: ShownReaction[];
  throws: ShownThrow[];
  room: RoomView | null;
  error: ErrorCode | null; // the last refusal, shown until the next message is sent
  missing: boolean; // there's no room with this code
  send: (msg: ClientMessage) => void;
}

/**
 * Connects to room `code` and keeps its latest view. With a seat key from earlier, the seat is taken
 * back at once; otherwise the room is only looked at until the player joins. When `creating`, the
 * room doesn't exist yet: the lobby form sends 'create'.
 */
export function useRoom(code: string, creating: boolean): RoomState {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [missing, setMissing] = useState(false);
  const [reactions, setReactions] = useState<ShownReaction[]>([]);
  const [throws, setThrows] = useState<ShownThrow[]>([]);
  const nextReaction = useRef(0);
  const connection = useRef<RoomConnection | null>(null);
  const waitingToCreate = useRef(creating);

  useEffect(() => {
    const look = () => {
      if (!waitingToCreate.current) connection.current?.send({ t: 'look' });
    };
    const c = new RoomConnection(`${ROOM_SERVER}/room/${code}`, {
      onOpen: () => {
        const key = seatKeyFor(code);
        if (key) c.send({ t: 'rejoin', key });
        else look();
      },
      onMessage: (msg) => {
        if (msg.t === 'welcome') {
          waitingToCreate.current = false;
          rememberSeat(code, msg.key);
        } else if (msg.t === 'room') {
          setRoom(msg.room);
          setMissing(false);
        } else if (msg.t === 'thrown') {
          const shown = { id: nextReaction.current++, from: msg.from, target: msg.target, item: msg.item };
          setThrows((list) => [...list.slice(-3), shown]);
          setTimeout(() => setThrows((list) => list.filter((x) => x !== shown)), THROW_SHOWN_MS);
        } else if (msg.t === 'reaction') {
          const shown = { id: nextReaction.current++, seat: msg.seat, reaction: msg.reaction };
          setReactions((list) => [...list.slice(-5), shown]);
          setTimeout(() => setReactions((list) => list.filter((r) => r !== shown)), REACTION_SHOWN_MS);
        } else if (msg.code === 'badSeatKey') {
          forgetSeat(code); // that seat is gone (left the lobby, or the room was replaced)
          look();
        } else if (msg.code === 'noRoom' && !waitingToCreate.current) {
          forgetSeat(code);
          setMissing(true);
        } else {
          setError(msg.code);
        }
      },
      onStatus: setStatus,
    });
    connection.current = c;
    return () => c.close();
  }, [code]);

  const send = useCallback((msg: ClientMessage) => {
    setError(null);
    connection.current?.send(msg);
  }, []);

  return { status, room, error, missing, send, reactions, throws };
}
