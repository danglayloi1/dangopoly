import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { formatMoney } from '../engine/money';
import type { GameState } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import { cellPosition } from './geometry';
import { Icon } from './icons';
import { festivalText } from './logText';
import { playerColor } from './look';
import type { Spot } from './motion';
import { TokenIcon } from './TokenIcon';
import type { ShownEffect } from './usePresentation';

/** The grid area of a spot: a board space, or the middle of the board for the bank. */
function area(spot: Spot): CSSProperties {
  if (spot === 'bank') return { gridRow: '2 / 11', gridColumn: '2 / 11' };
  const { row, col } = cellPosition(spot);
  return { gridRow: row + 1, gridColumn: col + 1 };
}

/** A sticker is wider than its space: on the board's left or right edge it leans inward, so it isn't cut off. */
function stickerEdge(space: number): string {
  const { col } = cellPosition(space);
  return col === 0 ? ' edge-start' : col === 10 ? ' edge-end' : '';
}

/**
 * Effects on the board: each one is placed in the board's grid on its own space, above the cells.
 * They only decorate; the board underneath already shows the result.
 */
export function BoardEffects({ effects, game }: { effects: ShownEffect[]; game: GameState }) {
  const { t } = useLang();
  return (
    <>
      {effects.map(({ id, effect: e }) => {
        switch (e.kind) {
          case 'seal':
            return (
              <div key={id} className="fx fx-seal" style={area(e.space)} aria-hidden="true">
                <span>{t.sealBought}</span>
              </div>
            );
          case 'money':
            return <MoneyFlight key={id} from={e.from} to={e.to} amount={e.amount} />;
          case 'build':
            return (
              <div key={id} className="fx fx-build" style={area(e.space)} aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            );
          case 'jail':
            return <div key={id} className="fx fx-jail" style={area(e.space)} aria-hidden="true" />;
          case 'haggle':
            return (
              <div key={id} className={`fx fx-sticker ${e.won ? 'good' : 'bad'}${stickerEdge(e.space)}`} style={area(e.space)} aria-hidden="true">
                <span>{e.won ? t.haggleWon : t.haggleLost}</span>
              </div>
            );
          case 'roadSticker':
            return (
              <div key={id} className={`fx fx-sticker bad${stickerEdge(e.space)}`} style={area(e.space)} aria-hidden="true">
                <span>{e.word === 'jam' ? t.jamSticker : t.rideSticker}</span>
              </div>
            );
          case 'anVa':
            return (
              <div key={id} className={`fx fx-sticker fx-anva${stickerEdge(e.space)}`} style={area(e.space)} aria-hidden="true">
                <span>{t.anVaShout}</span>
              </div>
            );
          case 'bankrupt': {
            const p = game.players[e.player];
            return (
              <div key={id} className="fx fx-tear" style={area(e.space)} aria-hidden="true">
                <span className="tear-left">
                  <TokenIcon token={p.token} color={playerColor(p)} size="100%" />
                </span>
                <span className="tear-right">
                  <TokenIcon token={p.token} color={playerColor(p)} size="100%" />
                </span>
              </div>
            );
          }
          default:
            return null; // festival banner and coin rain cover the screen (ScreenEffects)
        }
      })}
    </>
  );
}

/** Coins fly from one spot to another; the amount shows −… where they leave and +… where they land. */
function MoneyFlight({ from, to, amount }: { from: Spot; to: Spot; amount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [delta, setDelta] = useState<{ dx: number; dy: number } | null>(null);

  // Where the target is, measured from the coins' own spot once both are on screen.
  useLayoutEffect(() => {
    const el = ref.current;
    const board = el?.closest('.board');
    const target = board?.querySelector(to === 'bank' ? '.board-center' : `[data-space="${to}"]`);
    if (!el || !target) return;
    const a = el.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    setDelta({ dx: b.left + b.width / 2 - (a.left + a.width / 2), dy: b.top + b.height / 2 - (a.top + a.height / 2) });
  }, [to]);

  const style = { ...area(from), '--dx': `${delta?.dx ?? 0}px`, '--dy': `${delta?.dy ?? 0}px` } as CSSProperties;
  return (
    <div ref={ref} className="fx fx-money" style={style} aria-hidden="true">
      {delta && (
        <>
          {[0, 1, 2].map((i) => (
            <span key={i} className="fx-coin" style={{ '--i': i } as CSSProperties}>
              <Icon name="coins" />
            </span>
          ))}
          {from !== 'bank' && <span className="fx-amount fx-minus">−{formatMoney(amount)}</span>}
          {to !== 'bank' && <span className="fx-amount fx-plus">+{formatMoney(amount)}</span>}
        </>
      )}
    </div>
  );
}

/** Effects over the whole screen: the festival banner, and lucky money raining down. */
export function ScreenEffects({ effects, game }: { effects: ShownEffect[]; game: GameState }) {
  const { t, uiLang } = useLang();
  return (
    <>
      {effects.map(({ id, effect: e }) => {
        if (e.kind === 'festival') {
          return (
            <div key={id} className="fx-festival" role="status">
              <div className="fx-festival-scroll">
                <span className="fx-lantern" aria-hidden="true">
                  <Icon name="lantern" />
                </span>
                <div>
                  <strong>{t.festivalNames[e.festival.id]}</strong>
                  <span>{festivalText(e.festival, uiLang)}</span>
                </div>
                <span className="fx-lantern" aria-hidden="true">
                  <Icon name="lantern" />
                </span>
              </div>
            </div>
          );
        }
        if (e.kind === 'tet') {
          return (
            <div key={id} className="fx-festival fx-tet" role="status">
              <div className="fx-festival-scroll">
                <span className="fx-lantern" aria-hidden="true">
                  <Icon name="blossom" />
                </span>
                <div>
                  <strong>{t.tetTitle}</strong>
                  <span>{t.tetText(game.players[e.from].name, game.players[e.to].name, formatMoney(e.amount))}</span>
                </div>
                <span className="fx-lantern" aria-hidden="true">
                  <Icon name="blossom" />
                </span>
              </div>
            </div>
          );
        }
        if (e.kind === 'mission') {
          return (
            <div key={id} className="fx-festival fx-mission" role="status">
              <div className="fx-festival-scroll">
                <span className="fx-lantern" aria-hidden="true">
                  <Icon name="scroll" />
                </span>
                <div>
                  <strong>{t.missionDoneTitle}</strong>
                  <span>{t.missionDoneText(game.players[e.player].name, t.missions[e.mission].name, formatMoney(e.reward))}</span>
                </div>
              </div>
            </div>
          );
        }
        if (e.kind === 'coinRain') {
          return (
            <div key={id} className="fx-rain" aria-hidden="true">
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} style={{ '--x': `${(i * 53) % 100}%`, '--d': `${(i % 6) * 0.12}s` } as CSSProperties}>
                  <Icon name="coins" />
                </span>
              ))}
            </div>
          );
        }
        return null;
      })}
    </>
  );
}
