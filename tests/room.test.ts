import { describe, expect, it } from 'vitest';
import type { Profile } from '../src/net/protocol';
import { isReactionId, isRoomCode, newRoomCode, normalizeRoomCode } from '../src/net/protocol';
import {
  act,
  changeProfile,
  chat,
  cleanChat,
  cleanAction,
  cleanProfile,
  join,
  leave,
  rematch,
  newRoom,
  type Randomness,
  type RoomState,
  seatOfKey,
  start,
  view,
} from '../server/room';

// Fixed "random" numbers: dice come from a list, keys count up.
function fakeRandom(dice: number[] = []): Randomness {
  let k = 0;
  return { die: () => dice.shift() ?? 1, seed: () => 42, key: () => `key-${k++}` };
}

const DANG: Profile = { name: 'Đăng', token: 'nonLa', color: 'red' };
const LAN: Profile = { name: 'Lan', token: 'conTrau', color: 'indigo' };
const MINH: Profile = { name: 'Minh', token: 'quaCam', color: 'green' };
const HOA: Profile = { name: 'Hoa', token: 'xeDap', color: 'purple' };

function lobby(...profiles: Profile[]): RoomState {
  const random = fakeRandom();
  let { room } = newRoom('ABC234', profiles[0], random);
  for (const p of profiles.slice(1)) {
    const r = join(room, p, random);
    if (!r.ok) throw new Error(r.error);
    room = r.value.room;
  }
  return room;
}

function must<T>(r: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!r.ok) throw new Error(r.error);
  return r.value;
}

describe('room codes', () => {
  it('are 6 characters without look-alikes, and typing is forgiving', () => {
    for (let i = 0; i < 50; i++) expect(isRoomCode(newRoomCode())).toBe(true);
    expect(isRoomCode('ABC1O0')).toBe(false);
    expect(normalizeRoomCode(' abc-234 ')).toBe('ABC234');
  });
});

describe('lobby', () => {
  it('gives each phone a seat and a key to come back with', () => {
    const random = fakeRandom();
    const { room, key } = newRoom('ABC234', DANG, random);
    const joined = must(join(room, LAN, random));
    expect(joined.seat).toBe(1);
    expect(seatOfKey(joined.room, key)).toBe(0);
    expect(seatOfKey(joined.room, joined.key)).toBe(1);
    expect(seatOfKey(joined.room, 'guess')).toBeNull();
  });

  it('keeps tokens and colors different and allows at most 4 players', () => {
    const room = lobby(DANG, LAN);
    expect(join(room, { ...MINH, token: 'nonLa' }, fakeRandom())).toEqual({ ok: false, error: 'tokenTaken' });
    expect(join(room, { ...MINH, color: 'indigo' }, fakeRandom())).toEqual({ ok: false, error: 'colorTaken' });
    const four = lobby(DANG, LAN, MINH, HOA);
    expect(join(four, { name: 'Tư', token: 'bongDa', color: 'teal' }, fakeRandom())).toEqual({ ok: false, error: 'full' });
  });

  it('lets players change their choices, but not to someone else’s', () => {
    const room = lobby(DANG, LAN);
    expect(must(changeProfile(room, 1, { ...LAN, color: 'teal' })).seats[1].color).toBe('teal');
    expect(changeProfile(room, 1, { ...LAN, color: 'red' })).toEqual({ ok: false, error: 'colorTaken' });
  });

  it('passes the host on when the host leaves, and empties the room when the last one goes', () => {
    const room = must(leave(lobby(DANG, LAN, MINH), 0))!;
    expect(room.seats.map((s) => s.name)).toEqual(['Lan', 'Minh']);
    expect(room.host).toBe(0);
    expect(must(leave(lobby(DANG), 0))).toBeNull();
  });

  it('tidies names and refuses bad profiles', () => {
    expect(cleanProfile({ name: '  Lan   Anh ', token: 'conTrau', color: 'teal' })).toEqual({ name: 'Lan Anh', token: 'conTrau', color: 'teal' });
    expect(cleanProfile({ name: '', token: 'conTrau', color: 'teal' })).toBeNull();
    expect(cleanProfile({ name: 'x'.repeat(17), token: 'conTrau', color: 'teal' })).toBeNull();
    expect(cleanProfile({ name: 'Lan', token: 'rocket', color: 'teal' })).toBeNull();
    expect(cleanProfile({ name: 'Lan', token: 'conTrau', color: 'gold' })).toBeNull();
    expect(cleanProfile('Lan')).toBeNull();
  });
});

describe('starting', () => {
  it('only the host can start, with at least 2 players and sensible money', () => {
    expect(start(lobby(DANG, LAN), 1, 15_000_000, 'inOrder', fakeRandom())).toEqual({ ok: false, error: 'notHost' });
    expect(start(lobby(DANG), 0, 15_000_000, 'inOrder', fakeRandom())).toEqual({ ok: false, error: 'notEnoughPlayers' });
    expect(start(lobby(DANG, LAN), 0, 5, 'inOrder', fakeRandom())).toEqual({ ok: false, error: 'badMessage' });
    const room = must(start(lobby(DANG, LAN), 0, 15_000_000, 'inOrder', fakeRandom()));
    expect(room.game?.players.map((p) => [p.name, p.color, p.cash])).toEqual([
      ['Đăng', 'red', 15_000_000],
      ['Lan', 'indigo', 15_000_000],
    ]);
    expect(room.firstTurn).toBeNull();
  });

  it('rolls for who goes first, rerolls ties, and seats players in the new order', () => {
    // Round 1: Đăng 2+3, Lan 6+4, Minh 5+5 (Lan and Minh tie). Round 2: Lan 1+1, Minh 3+3.
    const random = fakeRandom([2, 3, 6, 4, 5, 5, 1, 1, 3, 3]);
    const before = lobby(DANG, LAN, MINH);
    const keys = before.seats.map((s) => s.key);
    const room = must(start(before, 0, 15_000_000, 'roll', random));
    expect(room.seats.map((s) => s.name)).toEqual(['Minh', 'Đăng', 'Lan']);
    expect(room.game?.players.map((p) => p.name)).toEqual(['Minh', 'Đăng', 'Lan']);
    expect(room.host).toBe(1); // Đăng is still the host, now in seat 1
    expect(seatOfKey(room, keys[1])).toBe(2); // Lan's key now points to her new seat
    expect(room.firstTurn).toEqual([
      [
        { seat: 1, dice: [2, 3] },
        { seat: 2, dice: [6, 4] },
        { seat: 0, dice: [5, 5] },
      ],
      [
        { seat: 2, dice: [1, 1] },
        { seat: 0, dice: [3, 3] },
      ],
    ]);
  });

  it('is too late to join once the game has started', () => {
    const room = must(start(lobby(DANG, LAN), 0, 15_000_000, 'inOrder', fakeRandom()));
    expect(join(room, MINH, fakeRandom())).toEqual({ ok: false, error: 'started' });
  });
});

describe('moves', () => {
  const playing = () => must(start(lobby(DANG, LAN), 0, 15_000_000, 'inOrder', fakeRandom()));

  it('accepts a move only from the player whose move it is', () => {
    const room = playing();
    expect(act(room, 1, { type: 'ROLL' })).toEqual({ ok: false, error: 'notYourMove' });
    const after = must(act(room, 0, { type: 'ROLL' }));
    expect(after.game?.dice).not.toBeNull();
  });

  it('ignores dice chosen by a phone', () => {
    const room = playing();
    const a = must(act(room, 0, { type: 'ROLL', dice: [6, 6] }));
    const b = must(act(room, 0, { type: 'ROLL' }));
    expect(a.game).toEqual(b.game); // same result as a normal roll, from the room's seed
  });

  it('refuses moves the rules don’t allow right now', () => {
    expect(act(playing(), 0, { type: 'END_TURN' })).toEqual({ ok: false, error: 'notAllowed' });
  });

  it('only lets through moves with a known shape', () => {
    expect(cleanAction({ type: 'BUILD_HOUSE', space: 3 })).toEqual({ type: 'BUILD_HOUSE', space: 3 });
    expect(cleanAction({ type: 'BUILD_HOUSE', space: 40 })).toBeNull();
    expect(cleanAction({ type: 'HACK' })).toBeNull();
    expect(cleanAction({ type: 'PROPOSE_TRADE', offer: { from: 0, to: 1, give: { spaces: [1], cash: 0, jailCards: 0 } } })).toBeNull();
    expect(cleanAction({ type: 'PROPOSE_TRADE', offer: { from: 0, to: 1, give: { spaces: [1], cash: -5, jailCards: 0 }, take: { spaces: [], cash: 0, jailCards: 0 } } })).toBeNull();
    expect(cleanAction(null)).toBeNull();
  });

  it('shows each phone its own seat and who is online', () => {
    const v = view(playing(), 1, new Set([0]));
    expect(v.you).toBe(1);
    expect(v.stage).toBe('playing');
    expect(v.seats.map((s) => s.online)).toEqual([true, false]);
    expect(JSON.stringify(v)).not.toContain('key-'); // seat keys never leave the server
  });
});

describe('game types online', () => {
  const T0 = 1_000_000;
  const timed = () =>
    must(start(lobby(DANG, LAN), 0, 15_000_000, 'inOrder', fakeRandom(), { mode: { kind: 'time', minutes: 20 }, festivals: true }, T0));

  it('start the game type the host chose, and refuse ones the game does not offer', () => {
    const room = must(start(lobby(DANG, LAN), 0, 15_000_000, 'inOrder', fakeRandom(), { mode: { kind: 'rounds', rounds: 15 }, festivals: false }));
    expect(room.game?.rules.mode).toEqual({ kind: 'rounds', rounds: 15 });
    const bad = start(lobby(DANG, LAN), 0, 15_000_000, 'inOrder', fakeRandom(), { mode: { kind: 'rounds', rounds: 1000 }, festivals: false });
    expect(bad).toEqual({ ok: false, error: 'badMessage' });
    expect(timed().game?.rules).toEqual({ mode: { kind: 'time', minutes: 20, endsAt: T0 + 20 * 60_000 }, festivals: true });
  });

  it('only let the time run out by the room clock, but from any phone', () => {
    const room = timed();
    expect(act(room, 1, { type: 'TIME_UP' }, T0 + 60_000)).toEqual({ ok: false, error: 'notAllowed' });
    const over = must(act(room, 1, { type: 'TIME_UP' }, T0 + 20 * 60_000));
    expect(over.game?.phase.kind).toBe('gameOver');
    expect(over.game?.endReason).toBe('time');
  });

  it('end the game at the next turn once time is up, even if no phone says so', () => {
    let room = must(act(timed(), 0, { type: 'ROLL' }, T0));
    const late = T0 + 21 * 60_000;
    // Play on until the turn passes; the move that starts the next turn ends the game.
    for (let i = 0; i < 10 && room.game!.phase.kind !== 'gameOver'; i++) {
      const phase = room.game!.phase.kind;
      const action = phase === 'awaitBuy' ? { type: 'DECLINE' } : phase === 'awaitRoll' ? { type: 'ROLL' } : { type: 'END_TURN' };
      room = must(act(room, room.game!.current, action, late));
    }
    expect(room.game?.endReason).toBe('time');
  });
});

describe('after the game', () => {
  const finished = () => {
    const room = must(start(lobby(DANG, LAN, MINH), 0, 15_000_000, 'roll', fakeRandom([1, 1, 6, 6, 2, 2])));
    room.game!.phase = { kind: 'gameOver', winner: 1 };
    return room;
  };

  it('lets the host take everyone back to the lobby for a new game', () => {
    const room = finished();
    const host = room.host;
    const again = must(rematch(room, host));
    expect(again.game).toBeNull();
    expect(again.firstTurn).toBeNull();
    expect(again.seats.map((s) => s.name)).toEqual(room.seats.map((s) => s.name)); // same seats, keys and choices
    expect(again.host).toBe(host);
    expect(must(start(again, host, 15_000_000, 'inOrder', fakeRandom())).game?.players).toHaveLength(3);
  });

  it('only the host, and only once the game is over', () => {
    const room = finished();
    expect(rematch(room, (room.host + 1) % 3)).toEqual({ ok: false, error: 'notHost' });
    const playing = must(start(lobby(DANG, LAN), 0, 15_000_000, 'inOrder', fakeRandom()));
    expect(rematch(playing, 0)).toEqual({ ok: false, error: 'notAllowed' });
  });

  it('accepts only the listed reactions', () => {
    expect(isReactionId('rangRua')).toBe(true);
    expect(isReactionId('toString')).toBe(false);
    expect(isReactionId('<script>')).toBe(false);
  });
});

describe('chat', () => {
  it('keeps messages with the sender as they were, the last 30 only', () => {
    let room = lobby(DANG, LAN);
    room = must(chat(room, 1, 'Răng rứa?', 1_000));
    expect(view(room, 0, new Set()).chat).toEqual([{ id: 1, seat: 1, name: 'Lan', color: 'indigo', text: 'Răng rứa?', at: 1_000 }]);
    for (let i = 0; i < 40; i++) room = must(chat(room, 0, `tin ${i}`, 2_000 + i));
    const kept = view(room, 0, new Set()).chat;
    expect(kept).toHaveLength(30);
    expect(kept.at(-1)).toMatchObject({ id: 41, text: 'tin 39' });
  });

  it('tidies text and refuses empty messages', () => {
    expect(cleanChat('  xin   chào\n\nbạn  ')).toBe('xin chào bạn');
    expect(cleanChat('a‮b​c')).toBe('a b c'); // invisible direction and zero-width characters
    expect(cleanChat('x'.repeat(300))).toHaveLength(200);
    expect(cleanChat('   ')).toBeNull();
    expect(cleanChat(42)).toBeNull();
    expect(chat(lobby(DANG), 0, '')).toEqual({ ok: false, error: 'badMessage' });
  });

  it('survives a rematch', () => {
    const room = must(chat(must(start(lobby(DANG, LAN), 0, 15_000_000, 'inOrder', fakeRandom())), 0, 'gg'));
    room.game!.phase = { kind: 'gameOver', winner: 0 };
    expect(must(rematch(room, room.host)).chat).toHaveLength(1);
  });
});
