// How fast moves and effects play: normal, fast (for long games or slow phones), or off.
// A device set to "reduce motion" always counts as off. The stylesheet reads the speed from
// --fx on <html> (1 = normal, 0.5 = fast), so CSS animations follow the same setting.

export type AnimSpeed = 'normal' | 'fast' | 'off';

const KEY = 'dangopoly.animSpeed';
const FACTORS: Record<AnimSpeed, number> = { normal: 1, fast: 0.5, off: 0 };

export function savedAnimSpeed(): AnimSpeed {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'normal' || v === 'fast' || v === 'off') return v;
  } catch {
    // storage unavailable: normal
  }
  return 'normal';
}

export function setAnimSpeed(speed: AnimSpeed): void {
  try {
    localStorage.setItem(KEY, speed);
  } catch {
    // just not remembered
  }
  applyAnimSpeed(speed);
}

export function applyAnimSpeed(speed: AnimSpeed = savedAnimSpeed()): void {
  const root = document.documentElement;
  root.dataset.anim = speed;
  root.style.setProperty('--fx', String(FACTORS[speed] || 1));
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** How long animations take compared with normal: 1, 0.5, or 0 when they're off. */
export function speedFactor(): number {
  return prefersReducedMotion() ? 0 : FACTORS[savedAnimSpeed()];
}
