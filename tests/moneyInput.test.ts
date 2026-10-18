import { describe, expect, it } from 'vitest';
import { formatMoney } from '../src/engine/money';
import { parseMoney } from '../src/ui/moneyInput';

describe('parseMoney', () => {
  it('reads the short forms the game shows', () => {
    expect(parseMoney('500k')).toBe(500_000);
    expect(parseMoney('2tr')).toBe(2_000_000);
    expect(parseMoney('1tr5')).toBe(1_500_000);
    expect(parseMoney('1tr25')).toBe(1_250_000);
    expect(parseMoney('1tr05')).toBe(1_050_000);
    expect(parseMoney('12tr75')).toBe(12_750_000);
  });

  it('reads decimal millions and plain thousands', () => {
    expect(parseMoney('1,5tr')).toBe(1_500_000);
    expect(parseMoney('1.5tr')).toBe(1_500_000);
    expect(parseMoney('2 triệu')).toBe(2_000_000);
    expect(parseMoney('500')).toBe(500_000);
    expect(parseMoney(' 300 K ')).toBe(300_000);
  });

  it('treats an empty box as zero', () => {
    expect(parseMoney('')).toBe(0);
    expect(parseMoney('   ')).toBe(0);
  });

  it('rejects anything else', () => {
    for (const bad of ['abc', '-500k', '1tr5k', '1.5', '1tr2345', 'k', 'tr', '5e3k']) {
      expect(parseMoney(bad)).toBeNull();
    }
  });

  it('reads back everything formatMoney writes', () => {
    for (const amount of [1_000, 50_000, 999_000, 1_000_000, 1_200_000, 1_250_000, 3_005_000, 15_000_000]) {
      expect(parseMoney(formatMoney(amount))).toBe(amount);
    }
  });
});
