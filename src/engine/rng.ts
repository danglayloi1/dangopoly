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

/** Returns [die value 1..6, next state]. */
export function rollDie(state: number): [number, number] {
  const [r, next] = nextUint32(state);
  return [(r % 6) + 1, next];
}
