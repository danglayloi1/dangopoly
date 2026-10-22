import { useId } from 'react';
import { START_SALARY, STARTING_CASH } from '../data/board';
import { formatMoney } from '../engine/money';
import { useLang } from '../i18n/LangContext';
import { millionsText, parseMillions } from './startingCash';

const STARTING_CASH_CHOICES = [10_000_000, STARTING_CASH, 20_000_000];

/**
 * How much money everyone starts with: three quick choices, or any amount typed in triệu.
 * The text is kept by the screen (read it with parseMillions); null there means it isn't valid.
 */
export function StartingCashPicker({ text, onText }: { text: string; onText: (text: string) => void }) {
  const { t, lang } = useLang();
  const id = useId();
  const amount = parseMillions(text);
  return (
    <div className="starting-cash">
      <h2 id={`${id}-label`}>{t.startingMoney}</h2>
      <div className="segmented" role="radiogroup" aria-labelledby={`${id}-label`}>
        {STARTING_CASH_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={choice === amount}
            className={choice === amount ? 'selected' : ''}
            onClick={() => onText(millionsText(choice, lang))}
          >
            {formatMoney(choice)}
          </button>
        ))}
      </div>
      <label className="cash-input">
        <span>{t.startingMoneyCustom}</span>
        <span className="cash-field">
          <input
            className={amount === null ? 'invalid' : ''}
            value={text}
            inputMode="decimal"
            maxLength={6}
            aria-invalid={amount === null}
            aria-describedby={`${id}-help`}
            onChange={(e) => onText(e.target.value)}
          />
          <span className="unit">{t.millionUnit}</span>
        </span>
        {amount !== null && <span className="cash-preview">= {formatMoney(amount)}</span>}
      </label>
      <p id={`${id}-help`} className={amount === null ? 'form-error' : 'muted'}>
        {amount === null ? t.startingMoneyInvalid : t.startingMoneyHint(formatMoney(START_SALARY))}
      </p>
    </div>
  );
}
