import type { LocalText } from './text';

export const TOKENS = [
  { id: 'nonLa', name: { vi: 'Nón lá', en: 'Conical hat' } },
  { id: 'conTrau', name: { vi: 'Con trâu', en: 'Water buffalo' } },
  { id: 'quaCam', name: { vi: 'Quả cam Xã Đoài', en: 'Xã Đoài orange' } },
  { id: 'bongDa', name: { vi: 'Bóng đá SLNA', en: 'SLNA football' } },
  { id: 'keoCuDo', name: { vi: 'Gói kẹo cu đơ', en: 'Cu đơ candy' } },
  { id: 'xeDap', name: { vi: 'Xe đạp', en: 'Bicycle' } },
  { id: 'choLuon', name: { vi: 'Bát cháo lươn', en: 'Eel porridge' } },
  { id: 'gaTrong', name: { vi: 'Gà trống', en: 'Rooster' } },
  { id: 'amChe', name: { vi: 'Ấm chè xanh', en: 'Green tea pot' } },
  { id: 'heoDat', name: { vi: 'Heo đất', en: 'Piggy bank' } },
  { id: 'conHen', name: { vi: 'Con hến sông Lam', en: 'Lam River clam' } },
  { id: 'muCoi', name: { vi: 'Mũ cối', en: 'Pith helmet' } },
  // Meme-style
  { id: 'shiba', name: { vi: 'Chó Shiba liếc', en: 'Side-eye Shiba' } },
  { id: 'ech', name: { vi: 'Ếch cười', en: 'Grinning frog' } },
  { id: 'meoKhoc', name: { vi: 'Mèo khóc', en: 'Crying cat' } },
  { id: 'vitCaoSu', name: { vi: 'Vịt cao su', en: 'Rubber duck' } },
] as const satisfies readonly { id: string; name: LocalText }[];

export type TokenId = (typeof TOKENS)[number]['id'];
