import { describe, expect, it } from 'vitest';
import { rollDie } from '../src/engine/rng';

function rollMany(seed: number, count: number): number[] {
  const out: number[] = [];
  let state = seed;
  for (let i = 0; i < count; i++) {
    const [die, next] = rollDie(state);
    out.push(die);
    state = next;
  }
  return out;
}

describe('rollDie', () => {
  it('gives the same rolls for the same seed', () => {
    expect(rollMany(123, 50)).toEqual(rollMany(123, 50));
  });

  it('gives different rolls for different seeds', () => {
    expect(rollMany(1, 50)).not.toEqual(rollMany(2, 50));
  });

  it('only rolls 1 to 6, each about equally often', () => {
    const n = 60_000;
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const die of rollMany(2026, n)) counts[die]++;
    expect(counts[0]).toBe(0);
    for (let face = 1; face <= 6; face++) {
      expect(counts[face] / n).toBeGreaterThan(0.155);
      expect(counts[face] / n).toBeLessThan(0.178);
    }
  });
});
