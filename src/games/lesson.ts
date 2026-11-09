// The guided first games of the card games: a fixed deal, and a list of steps. Each step says what to
// do; most ask for one move (anything else is refused with a reminder), then the computer's replies
// are played. The moves are real moves through the game's own rules, so the lesson can't drift from them.

import type { UiLang } from '../data/text';

export interface LessonStep<A> {
  text: { vi: string; en: string }; // Tiếng Nghệ reads the Vietnamese
  expect?: A; // the move to make; none: the step only explains, and "Tiếp" goes on
  replies?: A[]; // the computer's moves, played one by one afterwards
  glow?: number[]; // cards in your hand to point at
}

export interface Lesson<S, A> {
  start: (lang: UiLang) => S; // the deal (your name is "Bạn" or "You")
  steps: LessonStep<A>[];
  apply: (state: S, action: A) => S;
  same: (made: A, expected: A) => boolean; // whether a move is the one the step asks for
}

export const lessonText = (step: LessonStep<unknown>, lang: UiLang): string => (lang === 'en' ? step.text.en : step.text.vi);
