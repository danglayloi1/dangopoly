import { useState, type CSSProperties, type FormEvent } from 'react';
import { START_SALARY, STARTING_CASH } from '../data/board';
import { TOKENS, type TokenId } from '../data/tokens';
import { MAX_PLAYERS, MIN_PLAYERS, type NewPlayer } from '../engine/game';
import { formatMoney } from '../engine/money';
import { useLang } from '../i18n/LangContext';
import { LangSwitch } from './Header';
import { GROUP_COLORS, PLAYER_COLORS } from './look';
import { TokenIcon } from './TokenIcon';

const STARTING_CASH_CHOICES = [10_000_000, STARTING_CASH, 20_000_000];

interface Props {
  onStart: (players: NewPlayer[], startingCash: number) => void;
}

function firstFreeToken(used: TokenId[]): TokenId {
  return TOKENS.find((tok) => !used.includes(tok.id))!.id;
}

export function SetupScreen({ onStart }: Props) {
  const { t, lang } = useLang();
  const [players, setPlayers] = useState<NewPlayer[]>([
    { name: '', token: 'nonLa' },
    { name: '', token: 'conTrau' },
  ]);
  const [startingCash, setStartingCash] = useState(STARTING_CASH);
  const [showErrors, setShowErrors] = useState(false);

  const update = (i: number, change: Partial<NewPlayer>) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...change } : p)));

  const addPlayer = () =>
    setPlayers((ps) => [...ps, { name: '', token: firstFreeToken(ps.map((p) => p.token)) }]);

  const removePlayer = (i: number) => setPlayers((ps) => ps.filter((_, j) => j !== i));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (players.some((p) => p.name.trim() === '')) {
      setShowErrors(true);
      return;
    }
    onStart(
      players.map((p) => ({ ...p, name: p.name.trim() })),
      startingCash,
    );
  };

  return (
    <main className="setup">
      <div className="setup-top">
        <LangSwitch />
      </div>

      <section className="hero">
        <div className="color-strip" aria-hidden="true">
          {Object.values(GROUP_COLORS).map((c) => (
            <span key={c} className="chip" style={{ background: c }} />
          ))}
        </div>
        <h1>Dangopoly</h1>
        <p className="edition">{t.edition}</p>
        <p className="tagline">{t.tagline}</p>
      </section>

      <form className="setup-card" onSubmit={submit} noValidate>
        <h2>{t.players}</h2>

        {players.map((p, i) => {
          const usedByOthers = players.filter((_, j) => j !== i).map((o) => o.token);
          const missingName = showErrors && p.name.trim() === '';
          return (
            <fieldset key={i} className="player-row" style={{ '--player': PLAYER_COLORS[i] } as CSSProperties}>
              <legend className="visually-hidden">{t.playerN(i + 1)}</legend>
              <div className="player-row-top">
                <TokenIcon token={p.token} color={PLAYER_COLORS[i]} size={40} />
                <input
                  className={missingName ? 'invalid' : ''}
                  value={p.name}
                  maxLength={16}
                  placeholder={`${t.namePlaceholder} (${t.playerN(i + 1)})`}
                  aria-label={t.playerN(i + 1)}
                  aria-invalid={missingName}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                {players.length > MIN_PLAYERS && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`${t.removePlayer} ${i + 1}`}
                    title={t.removePlayer}
                    onClick={() => removePlayer(i)}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="token-picker" role="radiogroup" aria-label={t.chooseToken}>
                {TOKENS.map((tok) => {
                  const taken = usedByOthers.includes(tok.id);
                  const selected = p.token === tok.id;
                  return (
                    <button
                      key={tok.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={taken}
                      className={`token-choice${selected ? ' selected' : ''}`}
                      title={tok.name[lang]}
                      onClick={() => update(i, { token: tok.id })}
                    >
                      <TokenIcon token={tok.id} color={taken ? '#9aa1ad' : PLAYER_COLORS[i]} size={30} />
                      <span>{tok.name[lang]}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        {players.length < MAX_PLAYERS && (
          <button type="button" className="secondary add-player" onClick={addPlayer}>
            + {t.addPlayer}
          </button>
        )}

        <div className="starting-cash">
          <h2 id="starting-cash-label">{t.startingMoney}</h2>
          <div className="segmented" role="radiogroup" aria-labelledby="starting-cash-label">
            {STARTING_CASH_CHOICES.map((amount) => (
              <button
                key={amount}
                type="button"
                role="radio"
                aria-checked={amount === startingCash}
                className={amount === startingCash ? 'selected' : ''}
                onClick={() => setStartingCash(amount)}
              >
                {formatMoney(amount)}
              </button>
            ))}
          </div>
          <p className="muted">{t.startingMoneyHint(formatMoney(START_SALARY))}</p>
        </div>

        {showErrors && players.some((p) => p.name.trim() === '') && (
          <p className="form-error" role="alert">
            {t.needNames}
          </p>
        )}

        <button type="submit" className="primary big">
          {t.startGame}
        </button>
      </form>

      <footer>{t.footer}</footer>
    </main>
  );
}
