import { describe, expect, it } from 'vitest';
import { applyAction, createGame, legalActions } from '../src/engine/game';
import { parseSave, SAVE_VERSION, serializeGame } from '../src/engine/save';
import type { Action, GameState } from '../src/engine/types';

function midGame(): GameState {
  let s = createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Lan', token: 'conTrau' },
      { name: 'Minh', token: 'xeDap' },
    ],
    seed: 99,
  });
  const actions: Action[] = [{ type: 'ROLL', dice: [1, 2] }, { type: 'BUY' }, { type: 'END_TURN' }, { type: 'ROLL', dice: [2, 4] }];
  for (const a of actions) s = applyAction(s, a);
  return s;
}

describe('saving and loading', () => {
  it('gives back exactly the same game', () => {
    const game = midGame();
    const loaded = parseSave(serializeGame(game, new Date('2026-10-18T12:00:00Z')));
    expect(loaded).toEqual({ version: SAVE_VERSION, savedAt: '2026-10-18T12:00:00.000Z', game });
  });

  it('continues the game the same way after loading', () => {
    const game = midGame();
    const loaded = parseSave(serializeGame(game))!.game;
    const next = (s: GameState) => applyAction(s, { type: legalActions(s)[0] });
    expect(next(loaded)).toEqual(next(game)); // including the dice from the seeded RNG
  });

  it('gives saves from before color picking the seat colors', () => {
    const old = structuredClone(midGame()) as unknown as { players: Record<string, unknown>[] };
    for (const p of old.players) delete p.color;
    const text = JSON.stringify({ version: SAVE_VERSION, savedAt: '2026-10-18T12:00:00Z', game: old });
    expect(parseSave(text)?.game.players.map((p) => p.color)).toEqual(['red', 'indigo', 'green']);
  });

  it('ignores saves with an unknown or repeated color', () => {
    const odd = structuredClone(midGame());
    (odd.players[0] as { color: string }).color = 'gold';
    expect(parseSave(serializeGame(odd))).toBeNull();
    const twice = structuredClone(midGame());
    twice.players[1].color = twice.players[0].color;
    expect(parseSave(serializeGame(twice))).toBeNull();
  });

  it('keeps games in every phase', () => {
    const inDebt = structuredClone(midGame());
    inDebt.phase = { kind: 'inDebt', debtor: 1, creditor: 0, amount: 5_000_000, reason: { kind: 'rent', space: 3 } };
    expect(parseSave(serializeGame(inDebt))?.game.phase).toEqual(inDebt.phase);
  });
});

describe('ignoring saves that cannot be used', () => {
  it('nothing saved, or not JSON', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('')).toBeNull();
    expect(parseSave('{not json')).toBeNull();
    expect(parseSave(serializeGame(midGame()).slice(0, 200))).toBeNull(); // cut off
  });

  it('an older or newer save version', () => {
    const file = JSON.parse(serializeGame(midGame()));
    expect(parseSave(JSON.stringify({ ...file, version: SAVE_VERSION + 1 }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...file, version: 0 }))).toBeNull();
  });

  // Each change breaks one thing in an otherwise valid save.
  const breakers: [string, (g: any) => void][] = [
    ['one player', (g) => g.players.splice(1)],
    ['five players', (g) => g.players.push(g.players[0], g.players[0])],
    ['player id out of order', (g) => (g.players[1].id = 5)],
    ['empty name', (g) => (g.players[0].name = '  ')],
    ['unknown token', (g) => (g.players[0].token = 'dragon')],
    ['negative cash', (g) => (g.players[0].cash = -1)],
    ['fractional cash', (g) => (g.players[0].cash = 1.5)],
    ['position off the board', (g) => (g.players[0].position = 40)],
    ['missing jail fields', (g) => delete g.players[0].inJail],
    ['bad jail card', (g) => (g.players[0].jailCards = ['joker'])],
    ['current player missing', (g) => (g.current = 3)],
    ['owning a card space', (g) => (g.ownership[2] = { owner: 0, houses: 0, mortgaged: false })],
    ['owner not a player', (g) => (g.ownership[3] = { owner: 9, houses: 0, mortgaged: false })],
    ['six houses', (g) => (g.ownership[3] = { owner: 0, houses: 6, mortgaged: false })],
    ['unknown phase', (g) => (g.phase = { kind: 'party' })],
    ['dice of 7', (g) => (g.dice = [7, 1])],
    ['duplicate card in a deck', (g) => (g.decks.chance[0] = g.decks.chance[1])],
    ['card number too big', (g) => g.decks.community.push(16)],
    ['log missing', (g) => delete g.log],
    ['not an object', (g) => Object.setPrototypeOf(g, Array.prototype)],
  ];

  for (const [what, breakIt] of breakers) {
    it(`a save with ${what}`, () => {
      const file = JSON.parse(serializeGame(midGame()));
      breakIt(file.game);
      expect(parseSave(JSON.stringify(file.game instanceof Array ? { ...file, game: [] } : file))).toBeNull();
    });
  }
});
