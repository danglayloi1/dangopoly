// Seedable random numbers (mulberry32). The RNG state lives inside GameState,
// so a saved game continues with the same dice, and tests/tutorial are reproducible.

/** Returns [random uint32, next state]. */
export function nextUint32(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [(t ^ (t >>> 14)) >>> 0, next];
}

/** About one roll in this many, the dice roll off the table and must be rolled again. */
export const FUMBLE_ODDS = 40;

/** Whether the roll made from this state goes off the table. A different mix of the state than the dice use. */
export function diceFumbled(state: number): boolean {
  const h = Math.imul((state ^ 0x5bd1e995) >>> 0, 0x27d4eb2d) >>> 0;
  return (h ^ (h >>> 15)) % FUMBLE_ODDS === 0;
}

/** Returns [die value 1..6, next state]. */
export function rollDie(state: number): [number, number] {
  const [r, next] = nextUint32(state);
  return [(r % 6) + 1, next];
}
