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

function Die({ value }: { value: number | null }) {
  return (
    <div className={`die${value === null ? ' blank' : ''}`} role="img" aria-label={value === null ? '–' : String(value)}>
      {Array.from({ length: 9 }, (_, slot) => (
        <span key={slot} className={value !== null && PIPS[value].includes(slot) ? 'pip' : ''} />
      ))}
    </div>
  );
}

export function Dice({ dice }: { dice: DiceValues | null }) {
  return (
    <div className="dice">
      <Die value={dice?.[0] ?? null} />
      <Die value={dice?.[1] ?? null} />
    </div>
  );
}
