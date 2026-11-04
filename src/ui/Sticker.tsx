// Online reaction stickers, hand-drawn in the woodblock style: flat pigment with ink outlines.
// They are bigger than the icons (a 48-unit square), and a pale edge (folk.css) makes them look cut out.

import type { ReactNode } from 'react';
import { STICKERS, type StickerId } from '../net/protocol';

const INK = '#2b2420';
const CREAM = '#f6ecd4';
const RED = '#b8322a';
const YELLOW = '#d9a62e';
const GREEN = '#4f7a3a';
const SKY = '#6fa8c4';
const PINK = '#e89aa8';
const ROOSTER = '#c8662a';
const BUFFALO = '#55504b';
const MUZZLE = '#9a8c80';
const SKIN = '#eec9a0';
const HAIR = '#b8b4ae';

const DRAWINGS: Record<StickerId, ReactNode> = {
  // A buffalo sobbing, with tears running down
  trauKhoc: (
    <>
      <path d="M11 15 Q3 8 8 3 Q12 9 17 11 Z M37 15 Q45 8 40 3 Q36 9 31 11 Z" fill={CREAM} />
      <ellipse cx="24" cy="23" rx="14" ry="14" fill={BUFFALO} />
      <ellipse cx="24" cy="32" rx="9.5" ry="7" fill={MUZZLE} />
      <circle cx="20.5" cy="30.5" r="1.1" fill={INK} />
      <circle cx="27.5" cy="30.5" r="1.1" fill={INK} />
      <path d="M19.5 37 Q24 33.5 28.5 37" fill="none" />
      <path d="M13 19 Q16.5 23 20.5 20.5 M35 19 Q31.5 23 27.5 20.5" fill="none" stroke={CREAM} strokeWidth="2.2" />
      <path d="M15 22 Q10.5 30 13.5 34 Q18 31 15 22 Z M33 22 Q37.5 30 34.5 34 Q30 31 33 22 Z" fill={SKY} />
      <path d="M7 38 Q5 42 7 44 Q10 42 7 38 Z M41 38 Q43 42 41 44 Q38 42 41 38 Z" fill={SKY} />
    </>
  ),
  // A rooster in sunglasses, very pleased with himself
  gaVenh: (
    <>
      <path d="M14 13 L15 4 L20 9 L24 2 L28 9 L33 4 L34 13 Z" fill={RED} />
      <circle cx="24" cy="24" r="14" fill={ROOSTER} />
      <path d="M8 20 H40 L38 27 Q32.5 30.5 27.5 27 L25.5 22.5 H22.5 L20.5 27 Q15.5 30.5 10 27 Z" fill={INK} />
      <path d="M13 23.5 L16.5 23.5 M30 23.5 L33.5 23.5" fill="none" stroke={CREAM} strokeWidth="1.6" />
      <path d="M18 32 Q24 29 30 32 L24 39 Z" fill={YELLOW} />
      <path d="M21.5 39 Q24 46 26.5 39 Z" fill={RED} />
      <path d="M41 10 L43 6 M44 15 L47 13 M38 6 L38 2" fill="none" stroke={YELLOW} strokeWidth="1.8" />
    </>
  ),
  // A piggy bank, cracked and empty, with a fly going round it
  heoRong: (
    <>
      <path d="M10 37 V44 H15 V39 M30 39 V44 H35 V37" fill={PINK} />
      <path d="M25 17 L29 8 L33 18 Z" fill={PINK} />
      <ellipse cx="23" cy="28" rx="18" ry="13.5" fill={PINK} />
      <path d="M16 15.5 H25" fill="none" strokeWidth="2.2" />
      <path d="M21 16 L18 22 L23 26 L19 33 L22 40" fill="none" strokeWidth="1.5" />
      <ellipse cx="40" cy="28" rx="5" ry="5.6" fill="#f2b8c2" />
      <path d="M38.5 26.5 V29.5 M41.5 26.5 V29.5" fill="none" />
      <path d="M29 20 L33.5 24.5 M33.5 20 L29 24.5" fill="none" strokeWidth="1.8" />
      <path d="M33 33 Q35 38 37 34 Z" fill={RED} />
      <circle cx="8" cy="9" r="1.7" fill={INK} />
      <path d="M8 9 Q5 5.5 3.5 7.5 M8 9 Q11 5.5 12.5 7.5" fill="none" strokeWidth="1" />
      <path d="M14 11 Q19 7 16 4" fill="none" strokeDasharray="1.5 2.5" strokeWidth="1" />
    </>
  ),
  // A tooth, cracked on a piece of kẹo cu đơ (that candy is famously hard)
  keoGayRang: (
    <>
      <path d="M12 8 Q18 4 24 7 Q30 4 36 8 Q41 14 37 24 Q35 30 34 40 Q33 44 30 40 Q28 31 24 31 Q20 31 18 40 Q15 44 14 40 Q13 30 11 24 Q7 14 12 8 Z" fill="#fffaf0" />
      <path d="M24 7 L21 13 L26 16 L22.5 21" fill="none" strokeWidth="1.6" />
      <circle cx="16.5" cy="18" r="2.2" fill={INK} />
      <circle cx="31.5" cy="18" r="2.2" fill={INK} />
      <ellipse cx="24" cy="25" rx="2.6" ry="3" fill={INK} />
      <g transform="rotate(-18 39 39)">
        <rect x="31" y="34" width="16" height="10" rx="1.5" fill={CREAM} />
        <rect x="33" y="36.5" width="12" height="5" rx="0.8" fill="#8a5a2b" />
      </g>
      <path d="M3 5 L7 9 M2 15 H6 M45 5 L41 9 M46 15 H42" fill="none" stroke={RED} strokeWidth="1.8" />
    </>
  ),
  // A smiling cup of chè xanh: sit down, have some tea first
  uongChe: (
    <>
      <path d="M17 15 Q14 11 17 7 Q20 4 18 1 M28 15 Q25 11 28 7 Q31 4 29 1" fill="none" stroke={SKY} strokeWidth="2" />
      <path d="M38 24 Q47 24 44 31 Q42 36 36 34" fill="none" strokeWidth="3" />
      <path d="M8 20 H40 Q39 38 28 40 H20 Q9 38 8 20 Z" fill={CREAM} />
      <ellipse cx="24" cy="20" rx="16" ry="3.4" fill="#a9bf5a" />
      <path d="M15 28 Q18 25 21 28 M27 28 Q30 25 33 28" fill="none" strokeWidth="1.8" />
      <path d="M20 32 Q24 36.5 28 32" fill="none" strokeWidth="1.6" />
      <ellipse cx="14" cy="32" rx="2.2" ry="1.3" fill={PINK} stroke="none" />
      <ellipse cx="34" cy="32" rx="2.2" ry="1.3" fill={PINK} stroke="none" />
      <path d="M11 44 H37" fill="none" strokeWidth="3" />
    </>
  ),
  // A furious buffalo, steam snorting out of its nose
  trauHuc: (
    <>
      <path d="M11 17 Q2 13 6 4 Q11 10 18 12 Z M37 17 Q46 13 42 4 Q37 10 30 12 Z" fill={CREAM} />
      <ellipse cx="24" cy="24" rx="14" ry="14" fill={BUFFALO} />
      <path d="M12.5 16.5 L21 21 M35.5 16.5 L27 21" fill="none" stroke={CREAM} strokeWidth="2.4" />
      <circle cx="17" cy="22" r="1.7" fill={RED} stroke={CREAM} strokeWidth="0.8" />
      <circle cx="31" cy="22" r="1.7" fill={RED} stroke={CREAM} strokeWidth="0.8" />
      <ellipse cx="24" cy="33" rx="9.5" ry="7" fill={MUZZLE} />
      <circle cx="20.5" cy="31.5" r="1.2" fill={INK} />
      <circle cx="27.5" cy="31.5" r="1.2" fill={INK} />
      <path d="M21 35 Q24 40 27 35" fill="none" stroke={YELLOW} strokeWidth="2" />
      <path d="M11 37 Q6 39 7 35 Q3 36 3 33 Q3 30 7 31 Q9 28 11 31 Z M37 37 Q42 39 41 35 Q45 36 45 33 Q45 30 41 31 Q39 28 37 31 Z" fill="#fffaf0" />
    </>
  ),
  // A dép lào with wings, on its way to someone
  depBay: (
    <>
      <path d="M17 24 Q5 22 2 11 Q11 12 15 16 Q11 9 13 4 Q21 9 23 18 Z" fill={CREAM} />
      <path d="M31 24 Q43 22 46 11 Q37 12 33 16 Q37 9 35 4 Q27 9 25 18 Z" fill={CREAM} />
      <g transform="rotate(18 24 26)">
        <path d="M24 9 C16.5 9 14 14 14.5 20 C15 28 18 43 24 43 C30 43 33 28 33.5 20 C34 14 31.5 9 24 9 Z" fill={SKY} />
        <path d="M15.5 30 L24 18.5 L32.5 30" fill="none" stroke={RED} strokeWidth="3.4" />
        <circle cx="24" cy="18.5" r="2" fill={RED} />
      </g>
      <path d="M5 34 L2 37 M9 40 L6 44 M15 44 L13 47" fill="none" stroke={INK} strokeWidth="1.6" />
    </>
  ),
  // Mệ, the grandmother, wagging her finger; her mouth is red from betel
  meMang: (
    <>
      <circle cx="21" cy="7.5" r="4.5" fill={HAIR} />
      <circle cx="21" cy="25" r="14" fill={SKIN} />
      <path d="M7 24 Q7 10 21 10 Q35 10 35 24 Q30 15 21 15 Q12 15 7 24 Z" fill={HAIR} />
      <path d="M12.5 20.5 L19 23.5 M29.5 20.5 L23 23.5" fill="none" strokeWidth="2.2" />
      <circle cx="16" cy="25.5" r="1.4" fill={INK} />
      <circle cx="26" cy="25.5" r="1.4" fill={INK} />
      <ellipse cx="21" cy="33" rx="4.4" ry="3.2" fill="#8a2a24" />
      <rect x="38" y="16" width="3.6" height="14" rx="1.8" fill={SKIN} />
      <circle cx="39.8" cy="32" r="5" fill={SKIN} />
      <path d="M44.5 15 Q47 18.5 45.5 22 M35.5 14 Q33.5 16.5 34.2 19.5" fill="none" stroke={RED} strokeWidth="1.6" />
      <path d="M30 46 Q21 40 12 46" fill="none" stroke={GREEN} strokeWidth="3" />
    </>
  ),
};

export function Sticker({ id, size = 48 }: { id: StickerId; size?: number | string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className="sticker"
      role="img"
      aria-label={STICKERS[id]}
      stroke={INK}
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {DRAWINGS[id]}
    </svg>
  );
}
