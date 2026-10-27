import { useLayoutEffect, useState, type CSSProperties } from 'react';
import { useLang } from '../i18n/LangContext';
import type { ThrowItem } from '../net/protocol';
import type { ShownThrow } from '../net/useRoom';
import { speedFactor } from './animation';
import { Icon, type IconName } from './icons';
import { playSound } from './sound';

const FLIGHT_MS = 700;
const HIT_MS = 650;
const ITEM_ICONS: Record<ThrowItem, IconName> = { dep: 'slipper', banhChung: 'banhChung', hoa: 'blossom' };

/** The board token of a player (see Board.tsx's data-player). */
const tokenOf = (player: number) => document.querySelector<HTMLElement>(`.cell-token[data-player="${player}"]`);

/** Online: things players throw at each other's tokens, flying across the board. Just for fun. */
export function Throws({ throws }: { throws: ShownThrow[] }) {
  return (
    <>
      {throws.map((th) => (
        <Flight key={th.id} th={th} />
      ))}
    </>
  );
}

/** One throw: from the thrower's token (or the bottom of the screen) in an arc to the target's token. */
function Flight({ th }: { th: ShownThrow }) {
  const { t } = useLang();
  const [path, setPath] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const [landed, setLanded] = useState(false);

  useLayoutEffect(() => {
    const target = tokenOf(th.target)?.getBoundingClientRect();
    if (!target) return;
    const from = tokenOf(th.from)?.getBoundingClientRect();
    const x = from ? from.left + from.width / 2 : window.innerWidth / 2;
    const y = from ? from.top + from.height / 2 : window.innerHeight - 40;
    setPath({ x, y, dx: target.left + target.width / 2 - x, dy: target.top + target.height / 2 - y });
    playSound('whoosh');
    const flight = FLIGHT_MS * Math.max(speedFactor(), 0.4);
    const timer = setTimeout(() => {
      setLanded(true);
      playSound('thud');
      // The target token flinches.
      const token = tokenOf(th.target);
      token?.classList.add('hit');
      setTimeout(() => token?.classList.remove('hit'), HIT_MS);
    }, flight);
    return () => clearTimeout(timer);
  }, []);

  if (!path) return null;
  const style = { left: path.x, top: path.y, '--dx': `${path.dx}px`, '--dy': `${path.dy}px` } as CSSProperties;
  return (
    <div className={`fx-throw item-${th.item}${landed ? ' landed' : ''}`} style={style} aria-hidden="true">
      <span className="fx-throw-item">
        <Icon name={ITEM_ICONS[th.item]} size={40} />
      </span>
      {landed && <span className="fx-throw-hit">{t.throwHits[th.item]}</span>}
    </div>
  );
}
