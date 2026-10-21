import { PLAYER_COLORS, type PlayerColorId } from '../data/colors';
import { TOKENS, type TokenId } from '../data/tokens';
import { useLang } from '../i18n/LangContext';
import { TokenIcon } from './TokenIcon';

/** The six tokens to choose from, drawn in the player's color; ones taken by others are greyed out. */
export function TokenPicker({
  value,
  color,
  taken,
  onChange,
}: {
  value: TokenId;
  color: string;
  taken: readonly TokenId[];
  onChange: (token: TokenId) => void;
}) {
  const { t, lang } = useLang();
  return (
    <div className="token-picker" role="radiogroup" aria-label={t.chooseToken}>
      {TOKENS.map((tok) => {
        const isTaken = taken.includes(tok.id);
        const selected = value === tok.id;
        return (
          <button
            key={tok.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={isTaken}
            className={`token-choice${selected ? ' selected' : ''}`}
            title={tok.name[lang]}
            onClick={() => onChange(tok.id)}
          >
            <TokenIcon token={tok.id} color={isTaken ? '#9aa1ad' : color} size={30} />
            <span>{tok.name[lang]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The player colors as round swatches; ones taken by others can't be picked. */
export function ColorPicker({
  value,
  taken,
  onChange,
}: {
  value: PlayerColorId;
  taken: readonly PlayerColorId[];
  onChange: (color: PlayerColorId) => void;
}) {
  const { t, lang } = useLang();
  return (
    <div className="color-picker" role="radiogroup" aria-label={t.chooseColor}>
      {PLAYER_COLORS.map((c) => {
        const selected = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name[lang]}
            title={c.name[lang]}
            disabled={taken.includes(c.id)}
            className={`color-choice${selected ? ' selected' : ''}`}
            style={{ background: c.hex }}
            onClick={() => onChange(c.id)}
          />
        );
      })}
    </div>
  );
}
