import { describe, expect, it } from 'vitest';
import type { Profile, RoomListing } from '../src/net/protocol';
import { listingKey, MAX_LISTED, STALE_MS, visibleRooms } from '../server/directory';
import { join, listing, newRoom, setListed, start, view, type Randomness, type RoomState } from '../server/room';

function fakeRandom(): Randomness {
  let k = 0;
  return { die: () => 1, seed: () => 42, key: () => `key-${k++}` };
}

const DANG: Profile = { name: 'Đăng', token: 'nonLa', color: 'red' };
const LAN: Profile = { name: 'Lan', token: 'conTrau', color: 'indigo' };

function lobby(): RoomState {
  const random = fakeRandom();
  const { room } = newRoom('ABC234', DANG, random);
  const joined = join(room, LAN, random);
  if (!joined.ok) throw new Error(joined.error);
  return joined.value.room;
}

const both = new Set([0, 1]);

describe("a room's listing", () => {
  it('shows the host, players, stage and watchers', () => {
    const l = listing(lobby(), new Set([0]), 2, 1000)!;
    expect(l).toMatchObject({ code: 'ABC234', stage: 'lobby', host: 'Đăng', watchers: 2, round: null, updatedAt: 1000 });
    expect(l.players.map((p) => [p.name, p.online])).toEqual([
      ['Đăng', true],
      ['Lan', false],
    ]);
  });

  it('is playing with the round once the game starts', () => {
    const started = start(lobby(), 0, 15_000_000, 'inOrder', fakeRandom());
    if (!started.ok) throw new Error(started.error);
    expect(listing(started.value, both, 0)).toMatchObject({ stage: 'playing', round: 1 });
  });

  it('is not listed when the host hides the room, or when nobody is connected', () => {
    const hidden = setListed(lobby(), 0, false);
    if (!hidden.ok) throw new Error(hidden.error);
    expect(listing(hidden.value, both, 0)).toBeNull();
    expect(view(hidden.value, 0, both).listed).toBe(false);
    expect(listing(lobby(), new Set(), 3)).toBeNull();
  });

  it('can only be hidden by the host', () => {
    expect(setListed(lobby(), 1, false)).toEqual({ ok: false, error: 'notHost' });
    expect(setListed(lobby(), 0, 'no')).toEqual({ ok: false, error: 'badMessage' });
  });

  it('changes only when something shown changes, not with the time', () => {
    expect(listingKey(listing(lobby(), both, 0, 1))).toBe(listingKey(listing(lobby(), both, 0, 2)));
    expect(listingKey(listing(lobby(), both, 0, 1))).not.toBe(listingKey(listing(lobby(), both, 1, 1)));
  });
});

describe('the room list', () => {
  const entry = (code: string, stage: RoomListing['stage'], updatedAt: number, players = 2): RoomListing => ({
    code,
    stage,
    host: 'A',
    players: Array.from({ length: players }, (_, i) => ({ name: `P${i}`, token: 'nonLa', color: 'red', online: true })),
    watchers: 0,
    round: null,
    updatedAt,
  });

  it('shows rooms waiting for players first (free seats before full), then games, then finished ones', () => {
    const now = 10_000;
    const list = visibleRooms([entry('OVER22', 'over', 9_000), entry('PLAY22', 'playing', 9_500), entry('FULL22', 'lobby', 9_900, 4), entry('OPEN22', 'lobby', 8_000)], now);
    expect(list.map((r) => r.code)).toEqual(['OPEN22', 'FULL22', 'PLAY22', 'OVER22']);
  });

  it('drops stale rooms and shows at most MAX_LISTED', () => {
    const now = STALE_MS + 10;
    expect(visibleRooms([entry('OLD222', 'lobby', 5), entry('NEW222', 'lobby', now)], now).map((r) => r.code)).toEqual(['NEW222']);
    const many = Array.from({ length: MAX_LISTED + 5 }, (_, i) => entry(`R${i}`, 'lobby', now));
    expect(visibleRooms(many, now)).toHaveLength(MAX_LISTED);
  });
});
