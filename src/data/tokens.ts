import type { LocalText } from './text';

export const TOKENS = [
  { id: 'nonLa', name: { vi: 'Nón lá', en: 'Conical hat' } },
  { id: 'conTrau', name: { vi: 'Con trâu', en: 'Water buffalo' } },
  { id: 'quaCam', name: { vi: 'Quả cam Xã Đoài', en: 'Xã Đoài orange' } },
  { id: 'bongDa', name: { vi: 'Bóng đá SLNA', en: 'SLNA football' } },
  { id: 'keoCuDo', name: { vi: 'Gói kẹo cu đơ', en: 'Cu đơ candy' } },
  { id: 'xeDap', name: { vi: 'Xe đạp', en: 'Bicycle' } },
] as const satisfies readonly { id: string; name: LocalText }[];

export type TokenId = (typeof TOKENS)[number]['id'];
