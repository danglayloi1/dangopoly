import { useEffect, useState } from 'react';
import type { Action } from '../engine/types';
import { scriptedAction, TUTORIAL_STEPS, type TutorialStep } from './script';

const AUTO_DELAY_MS = 900; // pause before each of Lan's moves, so they're easy to follow

export interface Tutorial {
  active: boolean;
  step: TutorialStep;
  index: number;
  total: number;
  /** Use instead of the game's dispatch: plays only what the current step asks for. */
  dispatch: (action: Action) => void;
  /** Read-only steps: go on (only once Lan's moves have finished). */
  next: (() => void) | null;
  /** Counts the player's wrong moves, to nudge them. */
  nudges: number;
  /** Leave the tutorial and keep playing this game normally. */
  stop: () => void;
}

/**
 * Runs the tutorial on top of a game: `play` is the real dispatch, `busy` is true while a move is
 * still animating (nothing moves on until it has finished).
 */
export function useTutorial(enabled: boolean, play: (action: Action) => void, busy: boolean): Tutorial {
  const [active, setActive] = useState(enabled);
  const [index, setIndex] = useState(0);
  const [autoLeft, setAutoLeft] = useState<Action[]>(TUTORIAL_STEPS[0].auto ?? []);
  const [done, setDone] = useState(false); // the step's action has been played
  const [nudges, setNudges] = useState(0);
  const step = TUTORIAL_STEPS[index];

  const goTo = (i: number) => {
    const next = Math.min(i, TUTORIAL_STEPS.length - 1);
    setIndex(next);
    setAutoLeft(TUTORIAL_STEPS[next].auto ?? []);
    setDone(false);
  };

  // Lan's moves (and Lan accepting a trade) play by themselves, one at a time.
  useEffect(() => {
    if (!active || busy || autoLeft.length === 0) return;
    const timer = setTimeout(() => {
      play(autoLeft[0]);
      setAutoLeft((left) => left.slice(1));
    }, AUTO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, busy, autoLeft, play]);

  // Once the asked-for action has played out (animation included), show the next step.
  useEffect(() => {
    if (active && done && !busy) goTo(index + 1);
  }, [active, done, busy, index]);

  const dispatch = (action: Action) => {
    if (!active) {
      play(action);
      return;
    }
    if (step.expect && !done && autoLeft.length === 0 && step.expect(action)) {
      play(scriptedAction(step, action));
      setDone(true);
    } else {
      setNudges((n) => n + 1);
    }
  };

  const canGoOn = active && !step.expect && autoLeft.length === 0 && !busy && index < TUTORIAL_STEPS.length - 1;

  return {
    active,
    step,
    index,
    total: TUTORIAL_STEPS.length,
    dispatch,
    next: canGoOn ? () => goTo(index + 1) : null,
    nudges,
    stop: () => setActive(false),
  };
}
