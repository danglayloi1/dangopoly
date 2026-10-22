import { useEffect, useState } from 'react';

/** The current time, updated every `everyMs` while `active` (for the countdown in timed games). */
export function useNow(active: boolean, everyMs = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [active, everyMs]);
  return now;
}

/** "12:05" from a number of milliseconds (never below 0:00). */
export function clockText(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
