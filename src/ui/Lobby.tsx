import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { STARTING_CASH } from '../data/board';
import { PLAYER_COLORS } from '../data/colors';
import { TOKENS } from '../data/tokens';
import { CLASSIC_RULES, MAX_PLAYERS, MIN_PLAYERS, type RulesChoice } from '../engine/game';
import { useLang } from '../i18n/LangContext';
import { roomLink } from '../net/config';
import type { FirstTurn, Profile } from '../net/protocol';
import { forgetSeat } from '../net/seats';
import type { RoomState } from '../net/useRoom';
import { LangSwitch, ThemeButton } from './Header';
import { ChatBox } from './ChatBox';
import { colorHex } from './look';
import { ColorPicker, TokenPicker } from './Pickers';
import { QrCode } from './QrCode';
import { RulesPicker } from './RulesPicker';
import { millionsText, parseMillions } from './startingCash';
import { StartingCashPicker } from './StartingCashPicker';
import { TokenIcon } from './TokenIcon';
import { Icon } from './icons';

interface Props {
  code: string;
  creating: boolean; // this phone opened the room: it doesn't exist until the form is sent
  state: RoomState;
  onLeave: () => void;
}

/** Before an online game: invite friends, everyone picks a name, token and color, the host starts. */
export function Lobby({ code, creating, state, onLeave }: Props) {
  const { t, lang } = useLang();
  const { room, send, error, status } = state;
  const me = room?.you ?? null;
  const mine = me !== null ? room!.seats[me] : null;
  const isHost = me !== null && room!.host === me;
  const others = room ? room.seats.filter((_, i) => i !== me) : [];
  const takenTokens = others.map((s) => s.token);
  const takenColors = others.map((s) => s.color);
  const canJoin = room === null ? creating : room.stage === 'lobby' && room.seats.length < MAX_PLAYERS;

  const [profile, setProfile] = useState<Profile>({ name: '', token: 'nonLa', color: 'red' });
  const [nameMissing, setNameMissing] = useState(false);
  const [cashText, setCashText] = useState(() => millionsText(STARTING_CASH, lang));
  const startingCash = parseMillions(cashText);
  const [firstTurn, setFirstTurn] = useState<FirstTurn>('roll');
  const [rules, setRules] = useState<RulesChoice>(CLASSIC_RULES);
  const [chatOpen, setChatOpen] = useState(false);

  // Before joining, move off tokens and colors that others have taken meanwhile.
  useEffect(() => {
    if (me !== null) return;
    setProfile((p) => ({
      ...p,
      token: takenTokens.includes(p.token) ? TOKENS.find((tok) => !takenTokens.includes(tok.id))!.id : p.token,
      color: takenColors.includes(p.color) ? PLAYER_COLORS.find((c) => !takenColors.includes(c.id))!.id : p.color,
    }));
  }, [room]);

  // Once seated, the form shows what the room has for this player.
  useEffect(() => {
    if (mine) setProfile({ name: mine.name, token: mine.token, color: mine.color });
  }, [me, mine?.name, mine?.token, mine?.color]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (profile.name.trim() === '') {
      setNameMissing(true);
      return;
    }
    if (me !== null) send({ t: 'profile', profile });
    else send(room ? { t: 'join', profile } : { t: 'create', profile });
  };

  const leave = () => {
    if (me !== null && room?.stage === 'lobby') {
      send({ t: 'leave' });
      forgetSeat(code);
    }
    onLeave();
  };

  const link = roomLink(code);

  return (
    <main className="setup lobby">
      <div className="setup-top lobby-top">
        <button className="secondary small back-button" onClick={leave}>
          ← {me !== null ? t.leaveRoom : t.backToMenu}
        </button>
        <span className="spacer" />
        <ThemeButton />
        <LangSwitch />
      </div>

      <h1 className="lobby-title">{t.roomTitle(code)}</h1>
      {status !== 'open' && (
        <p className="connection-note" role="status">
          {status === 'connecting' ? t.connecting : t.reconnecting}
        </p>
      )}

      {room && <Invite code={code} link={link} />}

      {room && (
        <section className="setup-card">
          <h2>
            {t.inRoom} ({room.seats.length}/{MAX_PLAYERS})
          </h2>
          {room.watchers > 0 && (
            <p className="muted watchers-note">
              <Icon name="eye" /> {t.watchersCount(room.watchers)}
            </p>
          )}
          <ul className="lobby-seats">
            {room.seats.map((s, i) => (
              <li key={i} className={`lobby-seat${s.online ? '' : ' away'}`} style={{ '--player': colorHex(s.color) } as CSSProperties}>
                <TokenIcon token={s.token} color={colorHex(s.color)} size={36} />
                <span className="lobby-name">{s.name}</span>
                {i === room.host && <span className="badge">{t.hostBadge}</span>}
                {i === me && <span className="badge badge-you">{t.youBadge}</span>}
                {!s.online && <span className="badge badge-away">{t.offline}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(me !== null || canJoin) && (
        <form className="setup-card" onSubmit={submit} noValidate>
          <h2>{t.yourProfile}</h2>
          <fieldset className="player-row" style={{ '--player': colorHex(profile.color) } as CSSProperties}>
            <legend className="visually-hidden">{t.yourProfile}</legend>
            <div className="player-row-top">
              <TokenIcon token={profile.token} color={colorHex(profile.color)} size={40} />
              <input
                className={nameMissing ? 'invalid' : ''}
                value={profile.name}
                maxLength={16}
                placeholder={t.namePlaceholder}
                aria-label={t.namePlaceholder}
                aria-invalid={nameMissing}
                onChange={(e) => {
                  setProfile({ ...profile, name: e.target.value });
                  setNameMissing(false);
                }}
              />
            </div>
            <TokenPicker
              value={profile.token}
              color={colorHex(profile.color)}
              taken={takenTokens}
              onChange={(token) => setProfile({ ...profile, token })}
            />
            <ColorPicker value={profile.color} taken={takenColors} onChange={(color) => setProfile({ ...profile, color })} />
          </fieldset>
          {nameMissing && <p className="form-error">{t.onlineErrors.badProfile}</p>}
          <button type="submit" className={me === null ? 'primary big' : 'secondary'} disabled={status !== 'open'}>
            {me !== null ? t.saveProfile : room ? t.joinRoom : t.createRoom}
          </button>
        </form>
      )}
      {me === null && room && !canJoin && <p className="muted center">{t.roomClosed}</p>}

      {isHost && room && (
        <section className="setup-card">
          <label className="check-row listed-toggle">
            <input type="checkbox" checked={room.listed} onChange={(e) => send({ t: 'listed', listed: e.target.checked })} />
            <span>{t.listedLabel}</span>
          </label>
          <StartingCashPicker text={cashText} onText={setCashText} />
          <RulesPicker rules={rules} onChange={setRules} />
          <div className="first-turn-choice">
            <h2 id="online-first-label">{t.whoFirst}</h2>
            <div className="segmented" role="radiogroup" aria-labelledby="online-first-label">
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
          <button
            className="primary big"
            disabled={room.seats.length < MIN_PLAYERS || status !== 'open' || startingCash === null}
            onClick={() => startingCash !== null && send({ t: 'start', startingCash, firstTurn, rules })}
          >
            {t.startOnline} →
          </button>
          {room.seats.length < MIN_PLAYERS && <p className="muted center small-note">{t.needTwo}</p>}
        </section>
      )}
      {me !== null && !isHost && room && <p className="waiting-note">{t.waitingForHost(room.seats[room.host].name)}</p>}

      {error && (
        <p className="form-error center" role="alert">
          {t.onlineErrors[error]}
        </p>
      )}

      {room && me !== null && (
        <ChatBox room={room} onSend={(text) => send({ t: 'chat', text })} besideReactions={false} open={chatOpen} onOpenChange={setChatOpen} />
      )}
    </main>
  );
}

/** The room code, its link and QR code, with buttons to share or copy the link. */
function Invite({ code, link }: { code: string; link: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: the link is shown, so it can be copied by hand
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'Dangopoly', text: t.shareText, url: link });
    } catch {
      // closed without sharing
    }
  };

  return (
    <section className="setup-card invite-card">
      <h2>{t.invite}</h2>
      <p className="muted">{t.inviteHint}</p>
      <div className="invite-body">
        <QrCode text={link} label={t.roomTitle(code)} />
        <div className="invite-details">
          <span className="muted small-note">{t.roomCode}</span>
          <strong className="room-code">{code}</strong>
          <span className="invite-link">{link}</span>
          <div className="invite-buttons">
            {canShare && (
              <button type="button" className="primary" onClick={share}>
                {t.shareLink}
              </button>
            )}
            <button type="button" className="secondary" onClick={copy}>
              {copied ? `✓ ${t.linkCopied}` : t.copyLink}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
