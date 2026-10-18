import { describe, expect, it } from 'vitest';
import { millionsText, parseMillions } from '../src/ui/startingCash';

describe('parseMillions', () => {
  it('reads whole millions', () => {
    expect(parseMillions('15')).toBe(15_000_000);
    expect(parseMillions(' 2 ')).toBe(2_000_000);
    expect(parseMillions('100')).toBe(100_000_000);
  });

  it('reads one decimal with a comma or a dot', () => {
    expect(parseMillions('7,5')).toBe(7_500_000);
    expect(parseMillions('7.5')).toBe(7_500_000);
    expect(parseMillions('1,2')).toBe(1_200_000);
  });

  it('accepts a "tr" suffix', () => {
    expect(parseMillions('12tr')).toBe(12_000_000);
    expect(parseMillions('12 TR')).toBe(12_000_000);
  });

  it('rejects amounts outside 1tr to 100tr', () => {
    expect(parseMillions('0')).toBeNull();
    expect(parseMillions('0,5')).toBeNull();
    expect(parseMillions('101')).toBeNull();
  });

  it('rejects anything that is not a simple number', () => {
    for (const bad of ['', 'abc', '-5', '7,55', '1e3', '15000000đ', '7tr5', '1.000']) {
      expect(parseMillions(bad)).toBeNull();
    }
  });
});

describe('millionsText', () => {
  it('writes amounts the way each language types decimals', () => {
    expect(millionsText(15_000_000, 'vi')).toBe('15');
    expect(millionsText(7_500_000, 'vi')).toBe('7,5');
    expect(millionsText(7_500_000, 'en')).toBe('7.5');
  });

  it('round-trips through parseMillions', () => {
    for (const dong of [1_000_000, 7_500_000, 15_000_000, 99_900_000]) {
      expect(parseMillions(millionsText(dong, 'vi'))).toBe(dong);
      expect(parseMillions(millionsText(dong, 'en'))).toBe(dong);
    }
  });
});
