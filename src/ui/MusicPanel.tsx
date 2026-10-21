import { useState, type FormEvent } from 'react';
import { useLang } from '../i18n/LangContext';
import { Icon } from './icons';
import { DEFAULT_MUSIC, embedUrl, loadMusic, parseSpotifyLink, saveMusic, type SpotifySource } from './spotify';

/**
 * A music button in the corner of every screen. It opens a small Spotify player; the player is only
 * created on the first open (so nothing is loaded from Spotify before that), then kept while the
 * panel is hidden so the music goes on.
 */
export function MusicPanel() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [source, setSource] = useState<SpotifySource>(loadMusic);
  const [link, setLink] = useState('');
  const [badLink, setBadLink] = useState(false);

  const toggle = () => {
    setOpen((o) => !o);
    setStarted(true);
  };

  const choose = (next: SpotifySource | null) => {
    saveMusic(next);
    setSource(next ?? DEFAULT_MUSIC);
    setLink('');
    setBadLink(false);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseSpotifyLink(link);
    if (parsed) choose(parsed);
    else setBadLink(true);
  };

  const isDefault = source.kind === DEFAULT_MUSIC.kind && source.id === DEFAULT_MUSIC.id;

  return (
    <div className="music">
      {started && (
        <section className="music-panel" hidden={!open} aria-label={t.music}>
          <header className="music-header">
            <h2>{t.music}</h2>
            <button className="icon-button" aria-label={t.close} title={t.close} onClick={() => setOpen(false)}>
              ✕
            </button>
          </header>
          <iframe
            key={`${source.kind}:${source.id}`}
            title={t.music}
            src={embedUrl(source)}
            className="music-player"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
          <p className="muted music-hint">{t.musicHint}</p>
          <form className="music-own" onSubmit={submit} noValidate>
            <label htmlFor="music-link">{t.musicOwn}</label>
            <div className="music-own-row">
              <input
                id="music-link"
                value={link}
                inputMode="url"
                placeholder="https://open.spotify.com/playlist/…"
                aria-invalid={badLink}
                aria-describedby={badLink ? 'music-link-error' : undefined}
                className={badLink ? 'invalid' : ''}
                onChange={(e) => {
                  setLink(e.target.value);
                  setBadLink(false);
                }}
              />
              <button type="submit" className="secondary">
                {t.musicUse}
              </button>
            </div>
            {badLink && (
              <p id="music-link-error" className="form-error">
                {t.musicBadLink}
              </p>
            )}
            {!isDefault && (
              <button type="button" className="link" onClick={() => choose(null)}>
                {t.musicDefault}
              </button>
            )}
          </form>
        </section>
      )}
      <button
        className={`music-button${open ? ' open' : ''}`}
        aria-label={t.musicOpen}
        title={t.music}
        aria-expanded={open}
        onClick={toggle}
      >
        <Icon name="music" size={26} />
      </button>
    </div>
  );
}
