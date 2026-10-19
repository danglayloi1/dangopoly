import { describe, expect, it } from 'vitest';
import { applyAction, legalActions } from '../src/engine/game';
import type { GameState } from '../src/engine/types';
import { createTutorialGame, LAN, scriptedAction, TUTORIAL_STEPS, YOU } from '../src/tutorial/script';

/** Plays every step: its automatic actions, then the example of what the player is asked to do. */
function playThrough(upTo = TUTORIAL_STEPS.length): GameState[] {
  let game = createTutorialGame('vi');
  const states = [game];
  for (const step of TUTORIAL_STEPS.slice(0, upTo)) {
    for (const action of step.auto ?? []) game = applyAction(game, action);
    if (step.expect) {
      expect(step.example, `step ${step.id} needs an example`).toBeDefined();
      expect(step.expect(step.example!), `step ${step.id}: example doesn't match`).toBe(true);
      game = applyAction(game, scriptedAction(step, step.example!));
    }
    states.push(game);
  }
  return states;
}

const after = (id: string) => playThrough()[TUTORIAL_STEPS.findIndex((s) => s.id === id) + 1];

describe('tutorial script', () => {
  it('can be played from start to finish', () => {
    expect(() => playThrough()).not.toThrow();
  });

  it('every step has text in both languages', () => {
    for (const step of TUTORIAL_STEPS) {
      for (const text of [step.title, step.text, ...(step.wrong ? [step.wrong] : [])]) {
        expect(text.vi.trim()).not.toBe('');
        expect(text.en.trim()).not.toBe('');
      }
    }
  });

  it('starts with Lan owning three places and nobody else', () => {
    const game = createTutorialGame('en');
    expect(game.players.map((p) => p.name)).toEqual(['You', 'Lan']);
    expect(Object.keys(game.ownership).map(Number)).toEqual([1, 9, 15]);
  });

  it('teaches buying, then completing the brown set by trading', () => {
    expect(after('buy').ownership[3]?.owner).toBe(YOU);
    const traded = after('traded');
    expect(traded.ownership[1].owner).toBe(YOU);
    expect(traded.phase.kind).toBe('awaitEndTurn');
  });

  it('lets Lan pay rent on the new house', () => {
    const built = after('build');
    expect(built.ownership[3].houses).toBe(1);
    const paid = after('lanPaysRent');
    expect(paid.players[LAN].cash).toBe(built.players[LAN].cash - 200_000); // rent with 1 house
    expect(paid.players[YOU].cash).toBe(built.players[YOU].cash + 200_000);
    expect(paid.current).toBe(YOU);
  });

  it('draws the double-rent card on Chance', () => {
    const before = after('lanPaysRent');
    const s = after('rollCard');
    expect(s.players[YOU].position).toBe(15);
    expect(s.players[YOU].cash).toBe(before.players[YOU].cash - 500_000);
  });

  it('sends you to jail with the Khí vận card, despite doubles', () => {
    const s = after('rollJail');
    expect(s.players[YOU]).toMatchObject({ position: 10, inJail: true });
    expect(legalActions(s)).toEqual(['END_TURN']);
  });

  it('ends with you out of jail, owning a mortgaged Hồng Lĩnh', () => {
    const end = playThrough().at(-1)!;
    expect(end.players[YOU].inJail).toBe(false);
    expect(end.ownership[14]).toEqual({ owner: YOU, houses: 0, mortgaged: true });
    expect(end.players.every((p) => !p.bankrupt)).toBe(true);
  });

  it('only accepts the trade the lesson asks for', () => {
    const step = TUTORIAL_STEPS.find((s) => s.id === 'trade')!;
    const offer = (give: number[], take: number[], cash = 0) => ({
      type: 'PROPOSE_TRADE' as const,
      offer: { from: YOU, to: LAN, give: { spaces: give, cash, jailCards: 0 }, take: { spaces: take, cash: 0, jailCards: 0 } },
    });
    expect(step.expect!(offer([], [1], 1_000_000))).toBe(true);
    expect(step.expect!(offer([], [9]))).toBe(false); // the wrong place
    expect(step.expect!(offer([3], [1]))).toBe(false); // giving away the other brown
    expect(step.expect!(offer([], [1], 9_000_000))).toBe(false); // too much cash for the rest of the lesson
  });
});
