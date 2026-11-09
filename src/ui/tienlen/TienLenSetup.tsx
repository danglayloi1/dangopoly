import { useState, type CSSProperties, type FormEvent } from 'react';
import { PLAYER_COLORS, type PlayerColorId } from '../../data/colors';
import { TOKENS, type TokenId } from '../../data/tokens';
import { BOT_LEVELS, freeBotName } from '../../engine/bot';
import type { BotLevel } from '../../engine/types';
import { MAX_PLAYERS, MIN_PLAYERS, type NewTienLenPlayer } from '../../games/tienlen/game';
import { TIENLEN_TEXT } from '../../games/tienlen/text';
import { useLang } from '../../i18n/LangContext';
import { ScreenTop } from '../Header';
import { Icon } from '../icons';
import { colorHex } from '../look';
import { ColorPicker, TokenPicker } from '../Pickers';
import { TokenIcon } from '../TokenIcon';

const ME_KEY = 'dangopoly.tienlen.me';

interface Me {
  name: string;
  token: TokenId;
  color: PlayerColorId;
}

/** The last name, token and color used here, so the next game starts with them. */
function savedMe(): Me {
  try {
    const me = JSON.parse(localStorage.getItem(ME_KEY) ?? 'null') as Me | null;
    if (me && typeof me.name === 'string' && TOKENS.some((t) => t.id === me.token) && PLAYER_COLORS.some((c) => c.id === me.color)) return me;
  } catch {
    // nothing saved, or storage unavailable
  }
  return { name: '', token: 'nonLa', color: 'red' };
}

/**
 * Before a card game (Tiến lên, or Crazy Eights with `title`): your name, token and color, and one to three computer players with
 * their levels. The computer players take the free tokens, colors and nicknames.
 */
export function TienLenSetup({ title, onStart, onBack }: { title?: string; onStart: (players: NewTienLenPlayer[]) => void; onBack: () => void }) {
  const { t, uiLang } = useLang();
  const tl = TIENLEN_TEXT[uiLang];
  const [me, setMe] = useState<Me>(savedMe);
  const [bots, setBots] = useState<BotLevel[]>(['normal', 'normal', 'normal']);
  const [missingName, setMissingName] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = me.name.trim().replace(/\s+/g, ' ');
    if (name === '') {
      setMissingName(true);
      return;
    }
    try {
      localStorage.setItem(ME_KEY, JSON.stringify({ ...me, name }));
    } catch {
      // just not remembered
    }
    const players: NewTienLenPlayer[] = [{ name, token: me.token, color: me.color }];
    for (const level of bots) {
      players.push({
        name: freeBotName(players.map((p) => p.name)),
        token: TOKENS.find((t) => !players.some((p) => p.token === t.id))!.id,
        color: PLAYER_COLORS.find((c) => !players.some((p) => p.color === c.id))!.id,
        bot: level,
      });
    }
    onStart(players);
  };

  return (
    <main className="setup">
      <ScreenTop title={title ?? tl.name} onBack={onBack} />
      <form className="setup-card" onSubmit={submit} noValidate>
        <h2>{tl.you}</h2>
        <fieldset className="player-row" style={{ '--player': colorHex(me.color) } as CSSProperties}>
          <legend className="visually-hidden">{tl.you}</legend>
          <div className="player-row-top">
            <TokenIcon token={me.token} color={colorHex(me.color)} size={40} />
            <input
              className={missingName ? 'invalid' : ''}
              value={me.name}
              maxLength={16}
              placeholder={tl.yourName}
              aria-label={tl.yourName}
              aria-invalid={missingName}
              onChange={(e) => {
                setMe({ ...me, name: e.target.value });
                setMissingName(false);
              }}
            />
          </div>
          <TokenPicker value={me.token} color={colorHex(me.color)} taken={[]} onChange={(token) => setMe({ ...me, token })} />
          <ColorPicker value={me.color} taken={[]} onChange={(color) => setMe({ ...me, color })} />
        </fieldset>

        <h2>{tl.opponents}</h2>
        {bots.map((level, i) => (
          <div key={i} className="player-row is-bot tl-bot-row">
            <div className="player-row-top">
              <Icon name="bot" size={32} />
              <div className="bot-level">
                <div className="segmented" role="radiogroup" aria-label={`${tl.opponents} ${i + 1}`}>
                  {BOT_LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={level === l}
                      className={level === l ? 'selected' : ''}
                      onClick={() => setBots(bots.map((b, j) => (j === i ? l : b)))}
                    >
                      {t.botLevels[l]}
                    </button>
                  ))}
                </div>
              </div>
              {bots.length > MIN_PLAYERS - 1 && (
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`${t.removePlayer} ${i + 2}`}
                  title={t.removePlayer}
                  onClick={() => setBots(bots.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
        {bots.length < MAX_PLAYERS - 1 && (
          <button type="button" className="secondary add-bot" onClick={() => setBots([...bots, 'normal'])}>
            <Icon name="bot" /> {tl.addBot}
          </button>
        )}

        <button type="submit" className="primary big">
          {tl.deal} →
        </button>
      </form>
    </main>
  );
}
