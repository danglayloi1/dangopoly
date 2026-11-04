import type { ReactNode } from 'react';
import type { TokenId } from '../data/tokens';

// The local tokens as little woodblock stamps: pigment colors with ink outlines,
// on a disc of the player's color inside a gold rim.
const INK = '#2b2420';
const CREAM = '#f6ecd4';
const STRAW = '#e8c872';
const GOLD = '#d9ae4f';
const RED = '#b8322a';
const LEAF = '#5c8a3a';
const PINK = '#e89aa8';

const DRAWINGS: Record<TokenId, ReactNode> = {
  // Nón lá: conical hat with its ribs and chin strap
  nonLa: (
    <>
      <path d="M16 6 L27 21.5 Q16 25 5 21.5 Z" fill={STRAW} />
      <path d="M16 6 L12.5 23.6 M16 6 L19.5 23.6" fill="none" strokeWidth="0.8" />
      <path d="M9 22.6 Q16 28.5 23 22.6" fill="none" stroke={CREAM} strokeWidth="1.6" />
    </>
  ),
  // Con trâu: buffalo head with curved horns
  conTrau: (
    <>
      <path d="M6 11 Q3 5 10 6.5 L12.5 11 Z M26 11 Q29 5 22 6.5 L19.5 11 Z" fill={CREAM} />
      <ellipse cx="16" cy="16" rx="7" ry="8" fill="#4d4642" />
      <ellipse cx="16" cy="21" rx="4.6" ry="3.1" fill="#9a8c80" />
      <circle cx="13" cy="14.5" r="1.1" fill={CREAM} stroke="none" />
      <circle cx="19" cy="14.5" r="1.1" fill={CREAM} stroke="none" />
    </>
  ),
  // Quả cam Xã Đoài: orange with a leaf
  quaCam: (
    <>
      <circle cx="16" cy="18" r="8.6" fill="#e8892b" />
      <path d="M16 9.5 Q19 4 24.5 6 Q21.5 10.5 16 9.5 Z" fill="#5c8a3a" />
      <path d="M11.5 15 Q12.5 12.5 15 12" fill="none" stroke={CREAM} strokeWidth="1.4" />
    </>
  ),
  // Bóng đá SLNA: football
  bongDa: (
    <>
      <circle cx="16" cy="16" r="9.6" fill={CREAM} />
      <path d="M16 11.5 L20.3 14.6 L18.7 19.6 H13.3 L11.7 14.6 Z" fill={INK} />
      <path d="M16 11.5 V6.5 M20.3 14.6 L25 13 M18.7 19.6 L21.5 24 M13.3 19.6 L10.5 24 M11.7 14.6 L7 13" fill="none" strokeWidth="1" />
    </>
  ),
  // Kẹo cu đơ: candy slab between two sheets of rice paper
  keoCuDo: (
    <>
      <rect x="5" y="9" width="22" height="14" rx="2" fill={CREAM} />
      <rect x="7" y="12.5" width="18" height="7" rx="1" fill="#8a5a2b" />
      <circle cx="11" cy="16" r="1.1" fill={STRAW} stroke="none" />
      <circle cx="16" cy="15" r="1.1" fill={STRAW} stroke="none" />
      <circle cx="21" cy="16.5" r="1.1" fill={STRAW} stroke="none" />
    </>
  ),
  // Xe đạp: bicycle, drawn as cream lines with an ink edge
  xeDap: (
    <>
      <g fill="none" strokeWidth="3.4">
        <circle cx="9" cy="20" r="5" />
        <circle cx="23" cy="20" r="5" />
        <path d="M9 20 L14 12 H21 L23 20 M14 12 L16.5 20 L21 12 M12 9 H16 M21 12 L20 8 H23" />
      </g>
      <g fill="none" stroke={CREAM} strokeWidth="1.6">
        <circle cx="9" cy="20" r="5" />
        <circle cx="23" cy="20" r="5" />
        <path d="M9 20 L14 12 H21 L23 20 M14 12 L16.5 20 L21 12 M12 9 H16 M21 12 L20 8 H23" />
      </g>
    </>
  ),
  // Cháo lươn: a steaming bowl, and the eel looking out of it
  choLuon: (
    <>
      <path d="M9 10 Q7 7.5 9 5 M24 10 Q26 7.5 24 5" fill="none" stroke={CREAM} strokeWidth="1.5" />
      <ellipse cx="16" cy="17.5" rx="11.5" ry="2.4" fill={STRAW} />
      <path d="M13.5 18.5 Q10 12 15 8 Q19 5.5 21.5 8 Q23 10.5 20 12 Q18 13.5 19 18.5 Z" fill="#7a6a30" />
      <circle cx="19" cy="8.8" r="1.1" fill={CREAM} stroke="none" />
      <path d="M4.5 17.5 Q16 21 27.5 17.5 Q27 25.5 20 26.5 H12 Q5 25.5 4.5 17.5 Z" fill={CREAM} />
      <path d="M7 22 Q16 25 25 22" fill="none" stroke="#2f4f6f" strokeWidth="1.3" />
    </>
  ),
  // Gà trống: a proud rooster with a red comb
  gaTrong: (
    <>
      <path d="M12 19 Q3 17 4 7 Q8 9 10 12 Q9 7 12 4.5 Q15 9 15 15 Z" fill={LEAF} />
      <path d="M14 25 V29 M19 25 V29 M12 29 H16 M17 29 H21" fill="none" />
      <path d="M8.5 17 Q9 26 17 26 Q25 25.5 24.5 16 L22.5 12 Q19 15 15 15 Q10 15 8.5 17 Z" fill="#c8662a" />
      <path d="M12 18.5 Q15 23.5 19.5 18.5 Q15 16.5 12 18.5 Z" fill={STRAW} />
      <circle cx="22.5" cy="10" r="4.2" fill="#c8662a" />
      <path d="M19.5 7 L19.8 3 L21.7 5.2 L23 2.5 L24.2 5.4 L26.3 4 L25.8 7.6 Z" fill={RED} />
      <path d="M26.4 8.8 L30 10.5 L26.4 12.2 Z" fill={STRAW} />
      <path d="M24.5 13.5 Q25.7 16.5 23.7 16.4 Q23 15 23.6 13.8 Z" fill={RED} />
      <circle cx="23.7" cy="9.3" r="1.1" fill={INK} stroke="none" />
    </>
  ),
  // Ấm chè xanh: the pot of green tea always on the go in a Nghệ house
  amChe: (
    <>
      <path d="M28 8 Q26.5 6 28 3.5" fill="none" stroke={CREAM} strokeWidth="1.5" />
      <path d="M6.5 13.5 Q0.5 17.5 6.5 22.5" fill="none" strokeWidth="2.6" />
      <path d="M22 15 L29.5 10 L30 13 L24 21 Z" fill={CREAM} />
      <ellipse cx="15" cy="18.5" rx="10" ry="8.5" fill={CREAM} />
      <path d="M8 11.8 Q15 7.5 22 11.8 Q15 14 8 11.8 Z" fill={LEAF} />
      <circle cx="15" cy="8.2" r="1.6" fill={LEAF} />
      <path d="M10.5 21.5 Q13 15 19.5 16.5 Q18 22.5 10.5 21.5 Z" fill={LEAF} />
      <path d="M10.5 21.5 L16 18" fill="none" strokeWidth="0.7" />
    </>
  ),
  // Heo đất: a clay piggy bank, with a coin on the way in
  heoDat: (
    <>
      <circle cx="14" cy="5.6" r="3.4" fill={GOLD} />
      <path d="M8.5 24 V28.5 H12 V25 M18 25 V28.5 H21.5 V24" fill={PINK} />
      <path d="M5 16 Q1 15 3 12 Q5.5 12.5 4 14.5" fill="none" />
      <path d="M19 11.5 L21.5 6.5 L23.5 12.5 Z" fill={PINK} />
      <ellipse cx="15" cy="18" rx="11" ry="8" fill={PINK} />
      <path d="M10.5 10.9 H18" fill="none" strokeWidth="1.8" />
      <ellipse cx="26.3" cy="17.5" rx="3" ry="3.5" fill="#f2b8c2" />
      <path d="M25.4 16.5 V18.5 M27.2 16.5 V18.5" fill="none" strokeWidth="0.9" />
      <circle cx="21.3" cy="15" r="1.2" fill={INK} stroke="none" />
    </>
  ),
  // Hến sông Lam: a river clam with googly eyes
  conHen: (
    <>
      <path d="M16 5.5 C25.5 5.5 29.5 13 27.5 20 Q22 26.5 16 26.5 Q10 26.5 4.5 20 C2.5 13 6.5 5.5 16 5.5 Z" fill="#b89a6a" />
      <path d="M16 26 L16 19 M16 26 L9 8.5 M16 26 L23 8.5 M16 26 L5.5 15 M16 26 L26.5 15" fill="none" strokeWidth="0.7" />
      <circle cx="11.2" cy="14.5" r="4" fill={CREAM} />
      <circle cx="20.8" cy="14.5" r="4" fill={CREAM} />
      <circle cx="12.2" cy="15.5" r="1.7" fill={INK} stroke="none" />
      <circle cx="19.8" cy="13.5" r="1.7" fill={INK} stroke="none" />
      <path d="M12 21 Q16 24.5 20 21" fill="none" />
    </>
  ),
  // Mũ cối: the green pith helmet every grandfather still has
  muCoi: (
    <>
      <path d="M8 23 Q16 29.5 24 23" fill="none" stroke={CREAM} strokeWidth="1.5" />
      <path d="M6 19 Q6 7 16 7 Q26 7 26 19 Z" fill="#5e7042" />
      <circle cx="16" cy="6.6" r="1.4" fill="#6f8350" />
      <path d="M10 12.5 Q16 10.5 22 12.5" fill="none" strokeWidth="0.8" />
      <path d="M2.5 19.5 Q16 15.5 29.5 19.5 Q30.5 23 28 23.5 Q16 20 4 23.5 Q1.5 23 2.5 19.5 Z" fill="#6f8350" />
    </>
  ),
};

interface Props {
  token: TokenId;
  color: string;
  size?: number | string;
  title?: string;
}

export function TokenIcon({ token, color, size = 32, title }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className="token-icon"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      stroke={INK}
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <circle cx="16" cy="16" r="15.3" fill={GOLD} />
      <circle cx="16" cy="16" r="12.6" fill={color} />
      <g transform="translate(4.2 4.2) scale(0.74)">{DRAWINGS[token]}</g>
    </svg>
  );
}
