import { useEffect, useState } from 'react';
import type { Dice as DiceValues } from '../engine/types';

// Which of the 3×3 pip slots are filled for each face.
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, rolling }: { value: number | null; rolling: boolean }) {
  return (
    <div
      className={`die${value === null ? ' blank' : ''}${rolling ? ' rolling' : ''}${value === 1 || value === 4 ? ' red-pips' : ''}`}
      role="img"
      aria-label={value === null ? '–' : String(value)}
    >
      {Array.from({ length: 9 }, (_, slot) => (
        <span key={slot} className={value !== null && PIPS[value].includes(slot) ? 'pip' : ''} />
      ))}
    </div>
  );
}

const randomFace = () => 1 + Math.floor(Math.random() * 6);

/** Two dice. While `rolling`, they tumble through random faces before showing the result. */
export function Dice({ dice, rolling = false }: { dice: DiceValues | null; rolling?: boolean }) {
  const [faces, setFaces] = useState<[number, number]>([randomFace(), randomFace()]);

  useEffect(() => {
    if (!rolling) return;
    const timer = setInterval(() => setFaces([randomFace(), randomFace()]), 80);
    return () => clearInterval(timer);
  }, [rolling]);

  const shown = rolling ? faces : dice;
  return (
    <div className="dice">
      <Die value={shown?.[0] ?? null} rolling={rolling} />
      <Die value={shown?.[1] ?? null} rolling={rolling} />
    </div>
  );
}
