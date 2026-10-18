/**
 * Reads an amount typed the way the game shows money:
 *   "500k" -> 500_000, "2tr" -> 2_000_000, "1tr5" -> 1_500_000, "1tr25" -> 1_250_000,
 *   "1,5tr" / "1.5tr" -> 1_500_000, a plain number counts in thousands ("500" -> 500k),
 *   "" -> 0. Returns null for anything else, or for amounts that aren't whole thousands.
 */
export function parseMoney(text: string): number | null {
  const s = text.trim().toLowerCase().replace(/\s+/g, '').replace('triệu', 'tr');
  if (s === '') return 0;

  let amount: number;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d+)tr(\d{0,3})$/))) {
    // "1tr5": the digits after "tr" work like decimals of a million
    amount = Number(m[1]) * 1_000_000 + (m[2] ? Number(m[2].padEnd(3, '0')) * 1_000 : 0);
  } else if ((m = s.match(/^(\d+)[.,](\d{1,3})tr$/))) {
    amount = Number(m[1]) * 1_000_000 + Number(m[2].padEnd(3, '0')) * 1_000;
  } else if ((m = s.match(/^(\d+)k?$/))) {
    amount = Number(m[1]) * 1_000;
  } else {
    return null;
  }
  return Number.isSafeInteger(amount) ? amount : null;
}
