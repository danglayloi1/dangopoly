import { useLang } from '../i18n/LangContext';
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
