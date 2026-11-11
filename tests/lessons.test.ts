import { describe, expect, it } from 'vitest';
import { EIGHTS_LESSON } from '../src/games/eights/lesson';
import { playableCards } from '../src/games/eights/game';
import type { Lesson } from '../src/games/lesson';
import { MAUME_LESSON } from '../src/games/maume/lesson';
import { playableCards as mauMePlayable } from '../src/games/maume/game';
import { TIENLEN_LESSON } from '../src/games/tienlen/lesson';
import { legalPlays } from '../src/games/tienlen/game';

/** Plays a lesson through, as someone following every step would; the rules throw if a step is wrong. */
function playThrough<S extends { phase: string; current: number }, A>(lesson: Lesson<S, A>): S {
  let s = lesson.start('vi');
  for (const step of lesson.steps) {
    if (step.expect) {
      expect(s.current).toBe(0); // it's your move whenever a step asks for one
      s = lesson.apply(s, step.expect);
    }
    for (const reply of step.replies ?? []) {
      expect(s.current).toBe(1); // …and Cu Đơ's whenever he replies
      s = lesson.apply(s, reply);
    }
  }
  return s;
}

describe('the card game lessons', () => {
  it('Tiến lên: every step is a legal move, the cards it points at are the ones to play, and you go out first', () => {
    let s = TIENLEN_LESSON.start('en');
    expect(s.players[0].name).toBe('You');
    for (const step of TIENLEN_LESSON.steps) {
      if (step.expect?.type === 'PLAY') {
        const asked = step.expect.cards;
        expect(legalPlays(s).some((c) => c.cards.length === asked.length && c.cards.every((x) => asked.includes(x)))).toBe(true);
        expect([...(step.glow ?? [])].sort()).toEqual([...asked].sort());
      }
      if (step.expect) s = TIENLEN_LESSON.apply(s, step.expect);
      for (const reply of step.replies ?? []) s = TIENLEN_LESSON.apply(s, reply);
    }
    expect(s.phase).toBe('over');
    expect(s.players[0].place).toBe(1);
    expect(playThrough(TIENLEN_LESSON).phase).toBe('over');
  });

  it('Crazy Eights: every step is a legal move and you go out with the 8', () => {
    let s = EIGHTS_LESSON.start('vi');
    for (const step of EIGHTS_LESSON.steps) {
      if (step.expect?.type === 'PLAY') {
        expect(playableCards(s)).toContain(step.expect.card);
        // An 8 needs its suit: the lesson's screen asks for it, as in a real game.
        const move = step.expect.card === step.glow?.[0] && s.players[0].hand.length === 1 ? { ...step.expect, suit: 0 } : step.expect;
        s = EIGHTS_LESSON.apply(s, move);
      } else if (step.expect) s = EIGHTS_LESSON.apply(s, step.expect);
      for (const reply of step.replies ?? []) s = EIGHTS_LESSON.apply(s, reply);
    }
    expect(s.phase).toBe('over');
    expect(s.log.at(-1)).toMatchObject({ type: 'won', player: 0 });
  });

  it('Màu Mè: every step is a legal move, it points at the card to play, and you go out with the +4', () => {
    let s = MAUME_LESSON.start('en');
    expect(s.players[0].name).toBe('You');
    for (const step of MAUME_LESSON.steps) {
      if (step.expect?.type === 'PLAY') {
        expect(mauMePlayable(s)).toContain(step.expect.card);
        expect(step.glow).toEqual([step.expect.card]);
      }
      if (step.expect) {
        expect(s.current).toBe(0);
        s = MAUME_LESSON.apply(s, step.expect);
      }
      for (const reply of step.replies ?? []) {
        expect(s.current).toBe(1);
        s = MAUME_LESSON.apply(s, reply);
      }
    }
    expect(s.phase).toBe('over');
    expect(s.log.at(-1)).toMatchObject({ type: 'won', player: 0 });
    expect(s.log.some((e) => e.type === 'lastCard' && e.player === 0)).toBe(true);
    // A wild card may name any color.
    const wild = MAUME_LESSON.steps.at(-2)!.expect!;
    if (wild.type !== 'PLAY') throw new Error('not a play');
    expect(MAUME_LESSON.same({ type: 'PLAY', card: wild.card, color: 2 }, wild)).toBe(true);
  });

  it('a move is matched to the step: the same cards in any order; an 8 with any suit', () => {
    const tl = TIENLEN_LESSON.steps.find((st) => st.expect?.type === 'PLAY' && st.expect.cards.length === 3)!.expect!;
    if (tl.type !== 'PLAY') throw new Error('not a play');
    expect(TIENLEN_LESSON.same({ type: 'PLAY', cards: [...tl.cards].reverse() }, tl)).toBe(true);
    expect(TIENLEN_LESSON.same({ type: 'PASS' }, tl)).toBe(false);
    const eight = EIGHTS_LESSON.steps.at(-2)!.expect!;
    if (eight.type !== 'PLAY') throw new Error('not a play');
    expect(EIGHTS_LESSON.same({ type: 'PLAY', card: eight.card, suit: 3 }, eight)).toBe(true);
  });
});
