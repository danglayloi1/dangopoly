import { useEffect, useRef, useState } from 'react';
import type { GameState, LogEntry } from '../engine/types';
import { speedFactor } from './animation';
import { EFFECT_MS, effectsFor, hasMotion, newLogEntries, planMoves, soundFor, type Effect } from './motion';
import { playSound } from './sound';

const DICE_MS = 650;
const STEP_MS = 120;
const MAX_TRIP_MS = 1800; // long card trips hop faster

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** An effect being shown; the id tells React apart two of the same kind. */
export interface ShownEffect {
  id: number;
  effect: Effect;
}

export interface Presentation {
  positions: number[]; // where each token is drawn right now
  rolling: boolean; // the dice are tumbling
  fumbled: boolean; // ...off the table: the roll doesn't count (see diceFumbled in engine/rng)
  busy: boolean; // a move is playing out: hold back results and buttons
  effects: ShownEffect[]; // seals, flying coins, banners… (see effectsFor)
}

/**
 * Plays each change of the game as a little show: dice tumble, tokens hop space by space,
 * then the sounds and effects for what happened (at the speed chosen in Settings). The game itself has already moved on; this only
 * controls what the screen shows meanwhile.
 */
export function usePresentation(game: GameState): Presentation {
  const actual = game.players.map((p) => p.position);
  const [positions, setPositions] = useState(actual);
  const [rolling, setRolling] = useState(false);
  const [fumbled, setFumbled] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [effects, setEffects] = useState<ShownEffect[]>([]);
  const nextEffect = useRef(0);
  const shownRef = useRef(actual);
  const processedLog = useRef(game.log);

  // Decided during render, so the very first frame after a roll already holds things back.
  const fresh = newLogEntries(processedLog.current, game.log);
  const pending = game.log !== processedLog.current && hasMotion(fresh) && speedFactor() > 0;

  useEffect(() => {
    const entries = newLogEntries(processedLog.current, game.log);
    processedLog.current = game.log;
    const final = game.players.map((p) => p.position);
    let cancelled = false;

    const show = (next: number[]) => {
      shownRef.current = next;
      setPositions(next);
    };
    const factor = speedFactor();
    const playEventSounds = (list: LogEntry[]) => {
      const names = [...new Set(list.map(soundFor).filter((n) => n !== null))];
      names.forEach((name, i) => setTimeout(() => !cancelled && playSound(name), i * 140));
      if (factor === 0) return; // animations off: no effects either
      for (const effect of effectsFor(list, game)) {
        const shown = { id: nextEffect.current++, effect };
        setEffects((now) => [...now, shown]);
        setTimeout(() => setEffects((now) => now.filter((e) => e !== shown)), EFFECT_MS[effect.kind] * factor);
      }
    };

    if (!hasMotion(entries) || factor === 0) {
      show(final);
      setRolling(false);
      setAnimating(false);
      playEventSounds(entries);
      return;
    }

    setAnimating(true);
    const fumbles = entries.filter((e) => e.type === 'diceFumbled');
    const rest = entries.filter((e) => e.type !== 'diceFumbled');
    void (async () => {
      if (fumbles.length > 0) {
        // Off the table they go: the little scene plays out before the player may roll again.
        setRolling(true);
        setFumbled(true);
        playSound('dice');
        playEventSounds(fumbles);
        await sleep(EFFECT_MS.fumble * factor);
        if (cancelled) return;
        setFumbled(false);
        setRolling(false);
      }
      if (rest.some((e) => e.type === 'rolled')) {
        setRolling(true);
        playSound('dice');
        await sleep(DICE_MS * factor);
        if (cancelled) return;
        setRolling(false);
      }
      for (const move of planMoves(rest, shownRef.current)) {
        const stepMs = (move.jump ? 300 : Math.min(STEP_MS, MAX_TRIP_MS / move.path.length)) * factor;
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
      playEventSounds(rest);
    })();

    return () => {
      cancelled = true; // a newer change took over: it starts from wherever the tokens are now
    };
  }, [game]);

  return { positions, rolling, fumbled, busy: pending || animating, effects };
}
