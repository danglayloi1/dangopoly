import { useState } from 'react';
import { useLang } from '../i18n/LangContext';
import { savedAnimSpeed, setAnimSpeed, type AnimSpeed } from './animation';
import { LangSwitch, ScreenTop, SoundSettings, ThemePicker } from './Header';

/** Language, colors, sound effects, and where the music is. */
export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { t } = useLang();
  return (
    <main className="setup">
      <ScreenTop title={t.settings} onBack={onBack} controls={false} />
      <section className="setup-card">
        <h2>{t.language}</h2>
        <LangSwitch />
      </section>
      <section className="setup-card">
        <h2>{t.theme}</h2>
        <ThemePicker />
      </section>
      <section className="setup-card">
        <h2 id="anim-speed-label">{t.animSpeed}</h2>
        <AnimSpeedPicker />
        <p className="muted small-note">{t.animSpeedHint}</p>
      </section>
      <section className="setup-card">
        <h2>{t.soundSettings}</h2>
        <SoundSettings />
      </section>
      <section className="setup-card">
        <h2>{t.music}</h2>
        <p>{t.musicWhere}</p>
        <p className="muted">{t.musicLoginHelp}</p>
      </section>
    </main>
  );
}

function AnimSpeedPicker() {
  const { t } = useLang();
  const [speed, setSpeed] = useState(savedAnimSpeed);
  return (
    <div className="segmented" role="radiogroup" aria-labelledby="anim-speed-label">
      {(['normal', 'fast', 'off'] as AnimSpeed[]).map((choice) => (
        <button
          key={choice}
          type="button"
          role="radio"
          aria-checked={speed === choice}
          className={speed === choice ? 'selected' : ''}
          onClick={() => {
            setAnimSpeed(choice);
            setSpeed(choice);
          }}
        >
          {t.animSpeedNames[choice]}
        </button>
      ))}
    </div>
  );
}
