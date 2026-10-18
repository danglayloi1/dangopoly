import { describe, expect, it } from 'vitest';
import { formatMoney } from '../src/engine/money';

describe('formatMoney', () => {
  it('shows thousands as k', () => {
    expect(formatMoney(50_000)).toBe('50k');
    expect(formatMoney(150_000)).toBe('150k');
    expect(formatMoney(600_000)).toBe('600k');
  });

  it('shows whole millions as tr', () => {
    expect(formatMoney(1_000_000)).toBe('1tr');
    expect(formatMoney(2_000_000)).toBe('2tr');
    expect(formatMoney(15_000_000)).toBe('15tr');
  });

  it('shows the remainder after tr like decimal digits', () => {
    expect(formatMoney(1_200_000)).toBe('1tr2');
    expect(formatMoney(1_500_000)).toBe('1tr5');
    expect(formatMoney(1_250_000)).toBe('1tr25');
    expect(formatMoney(1_050_000)).toBe('1tr05');
    expect(formatMoney(12_750_000)).toBe('12tr75');
    expect(formatMoney(3_005_000)).toBe('3tr005');
  });

  it('handles zero and negatives', () => {
    expect(formatMoney(0)).toBe('0');
    expect(formatMoney(-500_000)).toBe('-500k');
    expect(formatMoney(-2_000_000)).toBe('-2tr');
  });

  it('falls back to full đồng for odd amounts', () => {
    expect(formatMoney(500)).toBe('500đ');
  });

  it('rejects fractional đồng', () => {
    expect(() => formatMoney(1.5)).toThrow();
  });
});
