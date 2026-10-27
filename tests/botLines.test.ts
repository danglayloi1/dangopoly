import { describe, expect, it } from 'vitest';
import { createGame } from '../src/engine/game';
import type { GameState, LogEntry } from '../src/engine/types';
import { botTalk, LINES, personalityOf } from '../src/ui/botLines';

function game(): GameState {
  return createGame({
    players: [
      { name: 'Đăng', token: 'nonLa' },
      { name: 'Hến', token: 'conTrau', bot: 'normal' },
      { name: 'Nhút', token: 'quaCam', bot: 'easy' },
    ],
    seed: 5,
  });
}

describe('what bots say', () => {
  it('gives each nickname its character, and other bots one by seat', () => {
    const g = game();
    expect(personalityOf(g.players[1])).toBe('stingy');
    expect(personalityOf(g.players[2])).toBe('jumpy');
    expect(personalityOf({ ...g.players[2], name: 'Máy' })).toBe('jumpy'); // seat 2 → the third character
  });

  it('has lines for every character and event, in both languages', () => {
    for (const lines of Object.values(LINES)) {
      for (const { vi, en } of Object.values(lines)) {
        expect(vi.length).toBeGreaterThan(0);
        expect(en.length).toBeGreaterThan(0);
      }
    }
  });

  it('reacts to big moments every time, in character', () => {
    const g = game();
    const entries: LogEntry[] = [{ type: 'wentToJail', player: 2, reason: 'space' }];
    const talks = botTalk(entries, g, 'vi');
    expect(talks).toHaveLength(1);
    expect(LINES.jumpy.jailed.vi).toContain(talks[0].text);
  });

  it('never speaks for people', () => {
    expect(botTalk([{ type: 'wentToJail', player: 0, reason: 'space' }], game(), 'vi')).toEqual([]);
  });

  it('says one thing per bot, about the biggest thing that happened', () => {
    const g = game();
    const entries: LogEntry[] = [
      { type: 'paidRent', player: 1, to: 0, space: 39, amount: 500_000 },
      { type: 'bankrupt', player: 1, creditor: 0 },
    ];
    const talks = botTalk(entries, g, 'en');
    expect(talks.map((t) => t.event)).toEqual(['bankrupt']);
    expect(LINES.stingy.bankrupt.en).toContain(talks[0].text);
  });

  it('both sides of a rent payment can react', () => {
    const g = game();
    const talks = botTalk([{ type: 'paidRent', player: 1, to: 2, space: 39, amount: 500_000 }], g, 'vi');
    expect(talks.find((t) => t.player === 1)?.event).toBe('paidRent'); // paying always gets a word
  });
});
