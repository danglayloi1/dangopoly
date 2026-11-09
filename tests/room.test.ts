import { describe, expect, it } from 'vitest';
import type { Profile } from '../src/net/protocol';
import { HIDDEN_CARD, isReactionId, isRoomCode, newRoomCode, normalizeRoomCode } from '../src/net/protocol';
import {
  act,
  addBot,
  botWaitMs,
  changeProfile,
  chat,
  cleanChat,
  cleanAction,
  cleanEightsAction,
  cleanProfile,
  cleanTienLenAction,
  join,
  kindOf,
  listing,
  leave,
  playBot,
  rematch,
  removeBot,
  newRoom,
  type Randomness,
  type RoomState,
  seatOfKey,
  setBotLevel,
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

describe('computer players in the room', () => {
  /** Đăng hosts, with computer players of these levels. */
  function withBots(...levels: ('easy' | 'normal' | 'hard')[]): RoomState {
    return levels.reduce((room, level) => must(addBot(room, 0, level, fakeRandom())), lobby(DANG));
  }

  it('the host adds them; each takes a free name, token and color', () => {
    const room = withBots('easy', 'hard');
    expect(room.seats.map((s) => s.bot)).toEqual([undefined, 'easy', 'hard']);
    expect(new Set(room.seats.map((s) => s.name)).size).toBe(3);
    expect(new Set(room.seats.map((s) => s.token)).size).toBe(3);
    expect(new Set(room.seats.map((s) => s.color)).size).toBe(3);
  });

  it('only the host, only before the game, only while a seat is free, only known levels', () => {
    const two = lobby(DANG, LAN);
    expect(addBot(two, 1, 'easy', fakeRandom())).toEqual({ ok: false, error: 'notHost' });
    expect(addBot(two, 0, 'genius', fakeRandom())).toEqual({ ok: false, error: 'badMessage' });
    expect(addBot(withBots('easy', 'easy', 'easy'), 0, 'easy', fakeRandom())).toEqual({ ok: false, error: 'full' });
    const started = must(start(withBots('easy'), 0, 15_000_000, 'inOrder', fakeRandom()));
    expect(addBot(started, 0, 'easy', fakeRandom())).toEqual({ ok: false, error: 'started' });
    expect(removeBot(started, 0, 1)).toEqual({ ok: false, error: 'started' });
    expect(setBotLevel(started, 0, 1, 'hard')).toEqual({ ok: false, error: 'started' });
  });

  it('the host can change a level or take one out, but never a person that way', () => {
    const room = must(addBot(lobby(DANG, LAN), 0, 'easy', fakeRandom()));
    expect(must(setBotLevel(room, 0, 2, 'hard')).seats[2].bot).toBe('hard');
    expect(setBotLevel(room, 0, 1, 'hard')).toEqual({ ok: false, error: 'badMessage' });
    expect(setBotLevel(room, 1, 2, 'hard')).toEqual({ ok: false, error: 'notHost' });
    expect(must(removeBot(room, 0, 2)).seats.map((s) => s.name)).toEqual(['Đăng', 'Lan']);
    expect(removeBot(room, 0, 1)).toEqual({ ok: false, error: 'badMessage' });
    expect(removeBot(room, 1, 2)).toEqual({ ok: false, error: 'notHost' });
  });

  it('count towards starting, and are always shown as here', () => {
    const room = withBots('hard');
    const started = must(start(room, 0, 15_000_000, 'inOrder', fakeRandom()));
    expect(started.game!.players.map((p) => p.bot)).toEqual([undefined, 'hard']);
    const seen = view(started, 0, new Set([0]));
    expect(seen.seats.map((s) => s.online)).toEqual([true, true]);
    expect(seen.seats[1].bot).toBe('hard');
    expect(JSON.stringify(seen)).not.toContain('key-');
  });

  it("don't keep a room or become host: the next person does, or the room closes", () => {
    expect(must(leave(withBots('easy'), 0))).toBeNull();
    const room = must(join(withBots('easy'), HOA, fakeRandom())).room; // Đăng, a bot, Hoa
    const after = must(leave(room, 0))!;
    expect(after.seats[after.host].name).toBe('Hoa');
  });

  it('the room plays them, up to the next person, and no phone can move for them', () => {
    let room = must(start(withBots('normal', 'normal'), 0, 15_000_000, 'inOrder', fakeRandom()));
    expect(playBot(room)).toBeNull(); // Đăng's move
    expect(botWaitMs(room, null)).toBeNull();
    room = must(act(room, 0, { type: 'ROLL' }));
    for (let i = 0; i < 10 && room.game!.current === 0; i++) {
      const moves = room.game!.phase.kind === 'awaitBuy' ? { type: 'DECLINE' } : { type: 'END_TURN' };
      room = must(act(room, 0, moves));
    }
    expect(room.game!.current).toBe(1);
    expect(act(room, 0, { type: 'ROLL' })).toEqual({ ok: false, error: 'notYourMove' });
    for (let i = 0; i < 200 && room.game!.current !== 0; i++) room = playBot(room)!;
    expect(room.game!.current).toBe(0);
    expect(playBot(room)).toBeNull();
  });

  it('waits for the last move to play out on the phones, then a little more', () => {
    const fresh = must(start(must(addBot(lobby(DANG), 0, 'normal', fakeRandom())), 0, 15_000_000, 'inOrder', fakeRandom()));
    const botFirst = { ...fresh, game: { ...fresh.game!, current: 1 } };
    expect(botWaitMs(botFirst, null)).toBeGreaterThan(0); // the board has just appeared
    const longer = botWaitMs({ ...botFirst, firstTurn: [] }, null)!;
    expect(longer).toBeGreaterThan(botWaitMs(botFirst, null)!); // people are reading the dice

    const pause = botWaitMs(botFirst, botFirst.game)!; // nothing to play out: just the pause
    const rolled = playBot(botFirst)!;
    const wait = botWaitMs(rolled, botFirst.game);
    expect(wait).toBeGreaterThan(pause); // the dice and the hops come first
  });

  it('a timed game ends after their move once time is up', () => {
    const rules = { mode: { kind: 'time', minutes: 1 }, festivals: false };
    const started = must(start(withBots('easy'), 0, 15_000_000, 'inOrder', fakeRandom(), rules, 0));
    let room: RoomState = { ...started, game: { ...started.game!, current: 1 } };
    const late = 10 * 60_000;
    for (let i = 0; i < 100 && room.game!.phase.kind !== 'gameOver'; i++) room = playBot(room, late) ?? must(act(room, 0, { type: 'TIME_UP' }, late));
    expect(room.game!.phase.kind).toBe('gameOver');
  });
});

describe('Tiến lên rooms', () => {
  /** A Tiến lên room with these people in it, Đăng hosting. */
  function tienLenLobby(...profiles: Profile[]): RoomState {
    const random = fakeRandom();
    let { room } = newRoom('TLN234', profiles[0], random, 'tienlen');
    for (const p of profiles.slice(1)) room = must(join(room, p, random)).room;
    return room;
  }
  const dealt = (...profiles: Profile[]) => must(start(tienLenLobby(...profiles), 0, undefined, 'inOrder', fakeRandom()));

  it('start with no options: 13 cards for each seat, the lowest card leading', () => {
    const room = dealt(DANG, LAN, MINH);
    expect(kindOf(room)).toBe('tienlen');
    expect(room.game).toBeNull();
    expect(room.tienlen!.players.map((p) => p.hand.length)).toEqual([13, 13, 13]);
    expect(start(room, 0, undefined, 'inOrder', fakeRandom())).toEqual({ ok: false, error: 'started' });
    expect(join(room, HOA, fakeRandom())).toEqual({ ok: false, error: 'started' });
  });

  it("each phone gets its own cards and only a count of everyone else's, and never the shuffle", () => {
    const room = dealt(DANG, LAN, MINH);
    const lan = view(room, 1, new Set([0, 1, 2])).tienlen!;
    expect(lan.players[1].hand).toEqual(room.tienlen!.players[1].hand);
    for (const i of [0, 2]) {
      expect(lan.players[i].hand).toHaveLength(13);
      expect(lan.players[i].hand.every((c) => c === HIDDEN_CARD)).toBe(true);
    }
    expect(lan.rngState).toBe(0);
    const watcher = view(room, null, new Set([0])).tienlen!;
    expect(watcher.players.every((p) => p.hand.every((c) => c === HIDDEN_CARD))).toBe(true);
    expect(JSON.stringify(room.tienlen!.players[0].hand)).not.toBe(JSON.stringify(watcher.players[0].hand));
  });

  it('only the player whose turn it is may play or pass', () => {
    const room = dealt(DANG, LAN);
    const turn = room.tienlen!.current;
    const other = 1 - turn;
    const lowest = room.tienlen!.mustInclude!;
    expect(act(room, other, { type: 'PLAY', cards: [room.tienlen!.players[other].hand[0]] })).toEqual({ ok: false, error: 'notYourMove' });
    const played = must(act(room, turn, { type: 'PLAY', cards: [lowest] }));
    expect(played.tienlen!.current).toBe(other);
    expect(act(played, turn, { type: 'PASS' })).toEqual({ ok: false, error: 'notYourMove' });
    expect(act(played, other, { type: 'PLAY', cards: [99] })).toEqual({ ok: false, error: 'badMessage' });
  });

  it('after a game only the host deals the next, or takes the room back to the lobby', () => {
    const room = dealt(DANG, LAN);
    const over = { ...room, tienlen: { ...room.tienlen!, phase: 'over' as const, players: room.tienlen!.players.map((p, i) => ({ ...p, place: i + 1 })) } };
    expect(act(over, 1, { type: 'NEXT_GAME' })).toEqual({ ok: false, error: 'notHost' });
    expect(must(act(over, 0, { type: 'NEXT_GAME' })).tienlen!.game).toBe(2);
    const back = must(rematch(over, 0));
    expect(back.tienlen).toBeNull();
    expect(view(back, 0, new Set([0])).stage).toBe('lobby');
  });

  it('refuses moves that are not a play, a pass or a new deal', () => {
    expect(cleanTienLenAction({ type: 'PLAY', cards: [3, 3] })).toBeNull();
    expect(cleanTienLenAction({ type: 'PLAY', cards: [] })).toBeNull();
    expect(cleanTienLenAction({ type: 'PLAY', cards: [52] })).toBeNull();
    expect(cleanTienLenAction({ type: 'ROLL' })).toBeNull();
    expect(cleanTienLenAction({ type: 'PLAY', cards: [5, 9], extra: true })).toEqual({ type: 'PLAY', cards: [5, 9] });
  });

  it('plays its computer players, after a pause', () => {
    let room = tienLenLobby(DANG);
    room = must(addBot(room, 0, 'normal', fakeRandom()));
    room = must(addBot(room, 0, 'hard', fakeRandom()));
    room = must(start(room, 0, undefined, 'inOrder', fakeRandom()));
    // Whoever holds the lowest card leads: if that's a bot, the room waits a moment, then plays it.
    const first = botWaitMs(room, null);
    if (room.tienlen!.current === 0) expect(first).toBeNull();
    else expect(first).toBeGreaterThan(0);
    // Let the bots play until it's Đăng's turn: the game never waits on them.
    for (let i = 0; i < 50 && room.tienlen!.current !== 0 && room.tienlen!.phase === 'playing'; i++) {
      expect(botWaitMs(room, room.tienlen!)).toBeGreaterThan(0);
      room = playBot(room)!;
    }
    expect(room.tienlen!.current === 0 || room.tienlen!.phase === 'over').toBe(true);
    if (room.tienlen!.phase === 'playing') {
      expect(playBot(room)).toBeNull();
      expect(botWaitMs(room, room.tienlen!)).toBeNull();
    }
  });

  it('show in the room list as Tiến lên, with the game number', () => {
    const room = dealt(DANG, LAN);
    expect(listing(room, new Set([0]), 0)).toMatchObject({ kind: 'tienlen', stage: 'playing', round: 1 });
    expect(listing(tienLenLobby(DANG), new Set([0]), 0)).toMatchObject({ kind: 'tienlen', stage: 'lobby' });
  });

  it('rooms saved before Tiến lên still play Dangopoly', () => {
    const { kind: _, ...old } = lobby(DANG, LAN);
    expect(kindOf(old)).toBe('dangopoly');
    expect(must(start(old, 0, 15_000_000, 'inOrder', fakeRandom())).game).not.toBeNull();
  });
});

describe('Crazy Eights rooms', () => {
  function eightsLobby(...profiles: Profile[]): RoomState {
    const random = fakeRandom();
    let { room } = newRoom('EIG234', profiles[0], random, 'eights');
    for (const p of profiles.slice(1)) room = must(join(room, p, random)).room;
    return room;
  }
  const dealt = (...profiles: Profile[]) => must(start(eightsLobby(...profiles), 0, undefined, 'inOrder', fakeRandom()));

  it('start with no options: hands dealt, a card turned up', () => {
    const room = dealt(DANG, LAN, MINH);
    expect(kindOf(room)).toBe('eights');
    expect(room.eights!.players.map((p) => p.hand.length)).toEqual([5, 5, 5]);
    expect(room.eights!.pile).toHaveLength(1);
    expect(join(room, HOA, fakeRandom())).toEqual({ ok: false, error: 'started' });
  });

  it('each phone sees its own hand, how many cards the others hold and how many are left to draw: no cards, no shuffle', () => {
    const room = dealt(DANG, LAN, MINH);
    const lan = view(room, 1, new Set([0, 1, 2])).eights!;
    expect(lan.players[1].hand).toEqual(room.eights!.players[1].hand);
    expect(lan.players[0].hand.every((c) => c === HIDDEN_CARD) && lan.players[0].hand.length === 5).toBe(true);
    expect(lan.deck).toHaveLength(room.eights!.deck.length);
    expect(lan.deck.every((c) => c === HIDDEN_CARD)).toBe(true);
    expect(lan.pile).toEqual(room.eights!.pile);
    expect(lan.rngState).toBe(0);
  });

  it("the card someone just drew stays theirs", () => {
    const room = dealt(DANG, LAN);
    const s = room.eights!;
    // Đăng draws a card that fits, so it waits for him to play it or pass.
    const fits = { ...s, current: 0, deck: [...s.deck.slice(0, -1), s.pile[0] < 4 ? s.pile[0] + 4 : s.pile[0] - 4] };
    const drawn = must(act({ ...room, eights: fits }, 0, { type: 'DRAW' }));
    expect(drawn.eights!.drawn).not.toBeNull();
    expect(view(drawn, 0, new Set([0, 1])).eights!.drawn).toBe(drawn.eights!.drawn);
    expect(view(drawn, 1, new Set([0, 1])).eights!.drawn).toBe(HIDDEN_CARD);
  });

  it('only the player whose turn it is moves; only the host deals again', () => {
    const room = dealt(DANG, LAN);
    const turn = room.eights!.current;
    expect(act(room, 1 - turn, { type: 'DRAW' })).toEqual({ ok: false, error: 'notYourMove' });
    expect(must(act(room, turn, { type: 'DRAW' })).eights!.log.at(-1)?.type).toBe('drew');
    const over = { ...room, eights: { ...room.eights!, phase: 'over' as const } };
    expect(act(over, 1, { type: 'NEXT_GAME' })).toEqual({ ok: false, error: 'notHost' });
    expect(must(act(over, 0, { type: 'NEXT_GAME' })).eights!.game).toBe(2);
  });

  it('refuses moves that are not a card, a draw, a pass or a new deal', () => {
    expect(cleanEightsAction({ type: 'PLAY', card: 52 })).toBeNull();
    expect(cleanEightsAction({ type: 'PLAY', card: 20, suit: 4 })).toBeNull();
    expect(cleanEightsAction({ type: 'ROLL' })).toBeNull();
    expect(cleanEightsAction({ type: 'PLAY', card: 20, suit: 2, extra: 1 })).toEqual({ type: 'PLAY', card: 20, suit: 2 });
  });

  it('plays its computer players and lists itself as Crazy Eights', () => {
    let room = eightsLobby(DANG);
    room = must(addBot(room, 0, 'normal', fakeRandom()));
    room = must(start(room, 0, undefined, 'inOrder', fakeRandom()));
    room = { ...room, eights: { ...room.eights!, current: 1 } };
    expect(botWaitMs(room, room.eights!)).toBeGreaterThan(0);
    const moved = playBot(room)!;
    expect(moved.eights!.log.length).toBeGreaterThan(room.eights!.log.length);
    expect(listing(room, new Set([0]), 0)).toMatchObject({ kind: 'eights', stage: 'playing', round: 1 });
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
    expect(isReactionId('trauKhoc')).toBe(true); // a drawn sticker
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
