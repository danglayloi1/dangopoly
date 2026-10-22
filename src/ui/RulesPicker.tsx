import type { RulesChoice } from '../engine/game';
import { useLang } from '../i18n/LangContext';
import { Icon } from './icons';

export const ROUND_CHOICES = [10, 15, 20, 30];
export const MINUTE_CHOICES = [20, 30, 45, 60];

type ModeKind = RulesChoice['mode']['kind'];

/** How the game ends (classic, a round limit or a time limit) and whether festivals happen. */
export function RulesPicker({ rules, onChange }: { rules: RulesChoice; onChange: (rules: RulesChoice) => void }) {
  const { t } = useLang();
  const { mode } = rules;

  const setKind = (kind: ModeKind) =>
    onChange({
      ...rules,
      mode: kind === 'rounds' ? { kind, rounds: 20 } : kind === 'time' ? { kind, minutes: 30 } : { kind },
    });

  return (
    <div className="rules-picker">
      <h2 id="game-mode-label">{t.gameMode}</h2>
      <div className="segmented" role="radiogroup" aria-labelledby="game-mode-label">
        {(['classic', 'rounds', 'time'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={mode.kind === kind}
            className={mode.kind === kind ? 'selected' : ''}
            onClick={() => setKind(kind)}
          >
            {{ classic: t.modeClassic, rounds: t.modeRounds, time: t.modeTime }[kind]}
          </button>
        ))}
      </div>

      {mode.kind === 'rounds' && (
        <div className="segmented small-choices" role="radiogroup" aria-label={t.modeRounds}>
          {ROUND_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={mode.rounds === n}
              className={mode.rounds === n ? 'selected' : ''}
              onClick={() => onChange({ ...rules, mode: { kind: 'rounds', rounds: n } })}
            >
              {t.roundsChoice(n)}
            </button>
          ))}
        </div>
      )}
      {mode.kind === 'time' && (
        <div className="segmented small-choices" role="radiogroup" aria-label={t.modeTime}>
          {MINUTE_CHOICES.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={mode.minutes === n}
              className={mode.minutes === n ? 'selected' : ''}
              onClick={() => onChange({ ...rules, mode: { kind: 'time', minutes: n } })}
            >
              {t.minutesChoice(n)}
            </button>
          ))}
        </div>
      )}
      <p className="muted small-note">{t.modeHints[mode.kind]}</p>

      <label className="festival-toggle">
        <input type="checkbox" checked={rules.festivals} onChange={(e) => onChange({ ...rules, festivals: e.target.checked })} />
        <span>
          <strong>
            <Icon name="lantern" /> {t.festivalsLabel}
          </strong>
          <span className="muted">{t.festivalsHint}</span>
        </span>
      </label>
    </div>
  );
}
