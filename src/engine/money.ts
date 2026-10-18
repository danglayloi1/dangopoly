// All money in the engine is stored as whole đồng (e.g. 1_500_000).
// The UI shows it in the short Vietnamese style used in the spec:
//   50_000 -> "50k", 1_000_000 -> "1tr", 1_200_000 -> "1tr2", 1_250_000 -> "1tr25"

const THOUSAND = 1_000;
const MILLION = 1_000_000;

export function formatMoney(amount: number): string {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money must be a whole number of đồng, got ${amount}`);
  }
  if (amount < 0) return '-' + formatMoney(-amount);
  if (amount === 0) return '0';
  if (amount < THOUSAND || amount % THOUSAND !== 0) {
    return amount.toLocaleString('vi-VN') + 'đ';
  }
  if (amount < MILLION) return `${amount / THOUSAND}k`;

  const millions = Math.floor(amount / MILLION);
  const rest = (amount % MILLION) / THOUSAND; // 0..999 thousands
  if (rest === 0) return `${millions}tr`;

  // Rest works like decimal digits: 200 -> "2", 250 -> "25", 50 -> "05".
  const digits = String(rest).padStart(3, '0').replace(/0+$/, '');
  return `${millions}tr${digits}`;
}
