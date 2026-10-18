import type { Lang } from '../data/text';

export const MIN_STARTING_CASH = 1_000_000; // 1tr
export const MAX_STARTING_CASH = 100_000_000; // 100tr

/**
 * Reads a starting amount typed in triệu (millions), e.g. "12", "7,5", "7.5" or "7.5tr".
 * Returns whole đồng, or null if it isn't a number from 1 to 100 with at most one decimal.
 */
export function parseMillions(text: string): number | null {
  const cleaned = text.trim().toLowerCase().replace(/\s*tr$/, '').replace(',', '.');
  if (!/^\d+(\.\d)?$/.test(cleaned)) return null;
  const dong = Math.round(Number(cleaned) * 10) * 100_000;
  if (dong < MIN_STARTING_CASH || dong > MAX_STARTING_CASH) return null;
  return dong;
}

/** The text to put in the input for an amount: 15_000_000 -> "15", 7_500_000 -> "7,5" (vi) / "7.5" (en). */
export function millionsText(dong: number, lang: Lang): string {
  const text = String(dong / 1_000_000);
  return lang === 'vi' ? text.replace('.', ',') : text;
}
