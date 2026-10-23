import { useState, type CSSProperties, type FormEvent } from 'react';
import { STARTING_CASH } from '../data/board';
import { defaultPlayerColor, PLAYER_COLORS, type PlayerColorId } from '../data/colors';
import { TOKENS, type TokenId } from '../data/tokens';
import { BOT_LEVELS } from '../engine/bot';
import { CLASSIC_RULES, MAX_PLAYERS, MIN_PLAYERS, type NewPlayer, type RulesChoice } from '../engine/game';
import type { BotLevel } from '../engine/types';
import { useLang } from '../i18n/LangContext';
import type { SaveFile } from '../engine/save';
import { FirstTurnDialog } from './FirstTurnDialog';
import { ScreenTop } from './Header';
import { colorHex } from './look';
import { millionsText, parseMillions } from './startingCash';
import { ColorPicker, TokenPicker } from './Pickers';
import { RulesPicker } from './RulesPicker';
import { StartingCashPicker } from './StartingCashPicker';
import { TokenIcon } from './TokenIcon';
import { Icon } from './icons';

interface Props {
  onStart: (players: NewPlayer[], startingCash: number, rules: RulesChoice) => void;
  onBack: () => void;
  saved: SaveFile | null; // a new game replaces it, so ask first
  vsBots?: boolean; // "play against the computer": starts with you and two computer players
}

/** Names for computer players: things Nghệ Tĩnh is known for. */
const BOT_NAMES = ['Cu Đơ', 'Nhút', 'Hến', 'Bưởi'];

function freeBotName(used: string[]): string {
  return BOT_NAMES.find((n) => !used.includes(n)) ?? BOT_NAMES[0];
}

function firstFreeToken(used: TokenId[]): TokenId {
  return TOKENS.find((tok) => !used.includes(tok.id))!.id;
}

function firstFreeColor(used: PlayerColorId[]): PlayerColorId {
  return PLAYER_COLORS.find((c) => !used.includes(c.id))!.id;
}

/** Every player in the setup form has a color (NewPlayer allows leaving it out). */
type SetupPlayer = NewPlayer & { color: PlayerColorId };

type FirstTurn = 'roll' | 'inOrder';

/** A game on this one device: names, tokens and colors, starting money, who goes first. */
export function SetupScreen({ onStart, onBack, saved, vsBots = false }: Props) {
  const { t, lang } = useLang();
  const [players, setPlayers] = useState<SetupPlayer[]>(() =>
    vsBots
      ? [
          { name: '', token: 'nonLa', color: defaultPlayerColor(0) },
          { name: BOT_NAMES[0], token: 'conTrau', color: defaultPlayerColor(1), bot: 'normal' },
          { name: BOT_NAMES[1], token: 'quaCam', color: defaultPlayerColor(2), bot: 'normal' },
        ]
      : [
          { name: '', token: 'nonLa', color: defaultPlayerColor(0) },
          { name: '', token: 'conTrau', color: defaultPlayerColor(1) },
        ],
  );
  const [firstTurn, setFirstTurn] = useState<FirstTurn>('roll');
  const [rules, setRules] = useState<RulesChoice>(CLASSIC_RULES);
  // While set, the "who goes first" dice are shown for these players.
  const [rollingFor, setRollingFor] = useState<NewPlayer[] | null>(null);
  // The starting money is whatever is typed in the box; the preset buttons just fill it in.
  const [cashText, setCashText] = useState(() => millionsText(STARTING_CASH, lang));
  const startingCash = parseMillions(cashText);
  const [showErrors, setShowErrors] = useState(false);

  const update = (i: number, change: Partial<SetupPlayer>) =>
    setPlayers((ps) => ps.map((p, j) => (j === i ? { ...p, ...change } : p)));

  // Against the computer, more players are more computer players.
  const addPlayer = () =>
    setPlayers((ps) => [
      ...ps,
      {
        name: vsBots ? freeBotName(ps.map((p) => p.name)) : '',
        token: firstFreeToken(ps.map((p) => p.token)),
        color: firstFreeColor(ps.map((p) => p.color)),
        ...(vsBots ? { bot: 'normal' as BotLevel } : {}),
      },
    ]);

  /** Switch a seat between a person and the computer (a computer player gets a name if it has none). */
  const setBot = (i: number, bot: boolean) =>
    setPlayers((ps) =>
      ps.map((p, j) => {
        if (j !== i || Boolean(p.bot) === bot) return p;
        if (bot) return { ...p, bot: 'normal', name: p.name.trim() || freeBotName(ps.map((o) => o.name)) };
        const { bot: _, ...person } = p;
        return { ...person, name: BOT_NAMES.includes(p.name) ? '' : p.name };
      }),
    );

  const removePlayer = (i: number) => setPlayers((ps) => ps.filter((_, j) => j !== i));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (players.some((p) => p.name.trim() === '') || startingCash === null) {
      setShowErrors(true);
      return;
    }
    if (saved && !window.confirm(t.newGameReplaces)) return;
    const named = players.map((p) => ({ ...p, name: p.name.trim() }));
    if (firstTurn === 'roll') setRollingFor(named);
    else onStart(named, startingCash, rules);
  };

  return (
    <main className="setup">
      <ScreenTop title={vsBots ? t.playBots : t.playLocal} onBack={onBack} />

      <form className="setup-card" onSubmit={submit} noValidate>
        <h2>{t.players}</h2>

        {players.map((p, i) => {
          const others = players.filter((_, j) => j !== i);
          const usedByOthers = others.map((o) => o.token);
          const colorsOfOthers = others.map((o) => o.color);
          const color = colorHex(p.color);
          const missingName = showErrors && p.name.trim() === '';
          return (
            <fieldset key={i} className={`player-row${p.bot ? ' is-bot' : ''}`} style={{ '--player': color } as CSSProperties}>
              <legend className="visually-hidden">{t.playerN(i + 1)}</legend>
              <div className="player-row-top">
                <TokenIcon token={p.token} color={color} size={40} />
                <input
                  className={missingName ? 'invalid' : ''}
                  value={p.name}
                  maxLength={16}
                  placeholder={`${t.namePlaceholder} (${t.playerN(i + 1)})`}
                  aria-label={t.playerN(i + 1)}
                  aria-invalid={missingName}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                <div className="segmented person-or-bot" role="radiogroup" aria-label={t.playerN(i + 1)}>
                  {([false, true] as const).map((bot) => (
                    <button
                      key={String(bot)}
                      type="button"
                      role="radio"
                      aria-checked={Boolean(p.bot) === bot}
                      className={Boolean(p.bot) === bot ? 'selected' : ''}
                      title={bot ? t.personOrBot.bot : t.personOrBot.person}
                      onClick={() => setBot(i, bot)}
                    >
                      <Icon name={bot ? 'bot' : 'person'} />
                      <span className="person-or-bot-text">{bot ? t.personOrBot.bot : t.personOrBot.person}</span>
                    </button>
                  ))}
                </div>
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
              {p.bot && (
                <div className="bot-level">
                  <span id={`bot-level-${i}`}>{t.botLevel}</span>
                  <div className="segmented" role="radiogroup" aria-labelledby={`bot-level-${i}`}>
                    {BOT_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={p.bot === level}
                        className={p.bot === level ? 'selected' : ''}
                        onClick={() => update(i, { bot: level })}
                      >
                        {t.botLevels[level]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <TokenPicker value={p.token} color={color} taken={usedByOthers} onChange={(token) => update(i, { token })} />
              <ColorPicker value={p.color} taken={colorsOfOthers} onChange={(c) => update(i, { color: c })} />
            </fieldset>
          );
        })}

        {players.length < MAX_PLAYERS && (
          <button type="button" className="secondary add-player" onClick={addPlayer}>
            + {t.addPlayer}
          </button>
        )}

        <StartingCashPicker text={cashText} onText={setCashText} />

        <RulesPicker rules={rules} onChange={setRules} />

        <div className="first-turn-choice">
          <h2 id="first-turn-label">{t.whoFirst}</h2>
          <div className="segmented" role="radiogroup" aria-labelledby="first-turn-label">
            {(['roll', 'inOrder'] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                role="radio"
                aria-checked={firstTurn === choice}
                className={firstTurn === choice ? 'selected' : ''}
                onClick={() => setFirstTurn(choice)}
              >
                {choice === 'roll' ? (
                  <>
                    <Icon name="dice" /> {t.firstByRoll}
                  </>
                ) : (
                  t.firstInOrder
                )}
              </button>
            ))}
          </div>
        </div>

        {showErrors && players.some((p) => p.name.trim() === '') && (
          <p className="form-error" role="alert">
            {t.needNames}
          </p>
        )}

        <button type="submit" className="primary big">
          {t.startGame}
        </button>
        {saved && <p className="muted center small-note">{t.newGameReplaces}</p>}
      </form>

      {rollingFor && startingCash !== null && (
        <FirstTurnDialog
          players={rollingFor}
          onDone={(ordered) => onStart(ordered, startingCash, rules)}
          onClose={() => setRollingFor(null)}
        />
      )}

    </main>
  );
}
