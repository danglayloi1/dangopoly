import { describe, expect, it } from 'vitest';
import { PLAYER_COLORS, SECOND_COLOR } from '../src/data/colors';
import { TOKENS } from '../src/data/tokens';

describe('player colours and tokens', () => {
  it('every colour has its own first colour, so a two-colour choice is found from it alone', () => {
    const firsts = PLAYER_COLORS.map((c) => c.hex);
    expect(new Set(firsts).size).toBe(firsts.length);
    const twoColour = PLAYER_COLORS.filter((c) => 'second' in c);
    expect(twoColour.length).toBeGreaterThan(0);
    for (const c of twoColour) expect(SECOND_COLOR[c.hex]).toBe((c as { second: string }).second);
    expect(SECOND_COLOR['#b8322a']).toBeUndefined(); // a one-colour choice has none
  });

  it('enough tokens and colours for every seat, each named in both languages', () => {
    expect(new Set(TOKENS.map((t) => t.id)).size).toBe(TOKENS.length);
    expect(TOKENS.length).toBeGreaterThanOrEqual(16);
    for (const t of TOKENS) expect(t.name.vi && t.name.en).toBeTruthy();
    for (const c of PLAYER_COLORS) expect(c.name.vi && c.name.en).toBeTruthy();
  });
});
