import { useEffect, useRef, useState } from 'react';
import type { GameState, LogEntry } from '../engine/types';
import { hasMotion, newLogEntries, planMoves, soundFor } from './motion';
import { playSound } from './sound';

const DICE_MS = 650;
const STEP_MS = 120;
const MAX_TRIP_MS = 1800; // long card trips hop faster

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export interface Presentation {
  positions: number[]; // where each token is drawn right now
  rolling: boolean; // the dice are tumbling
  busy: boolean; // a move is playing out: hold back results and buttons
}

/**
 * Plays each change of the game as a little show: dice tumble, tokens hop space by space,
 * then the sounds for what happened. The game itself has already moved on; this only
 * controls what the screen shows meanwhile.
 */
export function usePresentation(game: GameState): Presentation {
  const actual = game.players.map((p) => p.position);
  const [positions, setPositions] = useState(actual);
  const [rolling, setRolling] = useState(false);
  const [animating, setAnimating] = useState(false);
  const shownRef = useRef(actual);
  const processedLog = useRef(game.log);

  // Decided during render, so the very first frame after a roll already holds things back.
  const fresh = newLogEntries(processedLog.current, game.log);
  const pending = game.log !== processedLog.current && hasMotion(fresh) && !prefersReducedMotion();

  useEffect(() => {
    const entries = newLogEntries(processedLog.current, game.log);
    processedLog.current = game.log;
    const final = game.players.map((p) => p.position);
    let cancelled = false;

    const show = (next: number[]) => {
      shownRef.current = next;
      setPositions(next);
    };
    const playEventSounds = (list: LogEntry[]) => {
      const names = [...new Set(list.map(soundFor).filter((n) => n !== null))];
      names.forEach((name, i) => setTimeout(() => !cancelled && playSound(name), i * 140));
    };

    if (!hasMotion(entries) || prefersReducedMotion()) {
      show(final);
      setRolling(false);
      setAnimating(false);
      playEventSounds(entries);
      return;
    }

    setAnimating(true);
    void (async () => {
      if (entries.some((e) => e.type === 'rolled')) {
        setRolling(true);
        playSound('dice');
        await sleep(DICE_MS);
        if (cancelled) return;
        setRolling(false);
      }
      for (const move of planMoves(entries, shownRef.current)) {
        const stepMs = move.jump ? 300 : Math.min(STEP_MS, MAX_TRIP_MS / move.path.length);
        for (const pos of move.path) {
          if (cancelled) return;
          const next = [...shownRef.current];
          next[move.player] = pos;
          show(next);
          playSound(pos === 0 && !move.jump ? 'coins' : 'hop'); // coins when passing Start
          await sleep(stepMs);
        }
      }
      if (cancelled) return;
      show(final);
      setAnimating(false);
      playEventSounds(entries);
    })();

    return () => {
      cancelled = true; // a newer change took over: it starts from wherever the tokens are now
    };
  }, [game]);

  return { positions, rolling, busy: pending || animating };
}
