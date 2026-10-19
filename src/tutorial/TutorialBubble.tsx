import { useEffect, useRef, useState } from 'react';
import { useLang } from '../i18n/LangContext';
import type { Tutorial } from './useTutorial';

const NO_TARGETS: string[] = [];

interface Props {
  tutorial: Tutorial;
  onExit: () => void; // leave for the setup screen
}

/** Makes the elements this step is about glow, and keeps the hint above any open pop-up. */
function useHighlights(targets: readonly string[], popover: HTMLElement | null) {
  useEffect(() => {
    let openDialogs = -1;
    const update = () => {
      document.querySelectorAll<HTMLElement>('[data-tutorial]').forEach((el) => {
        el.classList.toggle('tutorial-target', targets.includes(el.dataset.tutorial ?? ''));
      });
      // A pop-up opened after the hint would cover it: show the hint again so it's on top.
      const open = document.querySelectorAll('dialog[open]').length;
      if (popover && open !== openDialogs) {
        openDialogs = open;
        popover.classList.toggle('with-dialog', open > 0); // on phones: smaller, at the top

        try {
          if (popover.matches(':popover-open')) popover.hidePopover();
          popover.showPopover();
        } catch {
          // no popover support: the hint simply stays in the page
        }
      }
    };
    update();
    const timer = setInterval(update, 250); // buttons come and go as the game changes
    return () => {
      clearInterval(timer);
      document.querySelectorAll('.tutorial-target').forEach((el) => el.classList.remove('tutorial-target'));
    };
  }, [targets, popover]);
}

export function TutorialBubble({ tutorial, onExit }: Props) {
  const { t, lang } = useLang();
  const { step, index, total, next, nudges } = tutorial;
  const ref = useRef<HTMLDivElement>(null);
  const [popover, setPopover] = useState<HTMLElement | null>(null);
  const [shake, setShake] = useState(false);
  const last = index === total - 1;

  useEffect(() => setPopover(ref.current), []);
  useHighlights(step.targets ?? NO_TARGETS, popover);

  // A wrong move: shake the hint and show what to do instead.
  const [wrongShown, setWrongShown] = useState(false);
  useEffect(() => {
    if (nudges === 0) return;
    setShake(true);
    setWrongShown(true);
    const timer = setTimeout(() => setShake(false), 450);
    return () => clearTimeout(timer);
  }, [nudges]);
  useEffect(() => setWrongShown(false), [index]);

  return (
    <div
      ref={ref}
      popover="manual"
      className={`tutorial-bubble${shake ? ' shake' : ''}`}
      role="dialog"
      aria-live="polite"
      aria-labelledby="tutorial-title"
    >
      <div className="tutorial-head">
        <span className="tutorial-badge">🎓 {t.tutorial}</span>
        <span className="muted">
          {index + 1}/{total}
        </span>
      </div>
      <div className="tutorial-progress" aria-hidden="true">
        <div style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <h2 id="tutorial-title">{step.title[lang]}</h2>
      <p>{step.text[lang]}</p>
      {wrongShown && step.expect && <p className="tutorial-wrong">👉 {step.wrong?.[lang] ?? t.tutorialFollow}</p>}
      {!step.expect && !next && !last && <p className="muted tutorial-wait">⏳ {t.tutorialWatch}</p>}

      <div className="tutorial-actions">
        {last ? (
          <>
            <button className="secondary" onClick={onExit}>
              {t.tutorialNewGame}
            </button>
            <button className="primary" onClick={tutorial.stop} autoFocus>
              {t.tutorialKeepPlaying}
            </button>
          </>
        ) : (
          <>
            <button className="link" onClick={onExit}>
              {t.tutorialSkip}
            </button>
            {next && (
              <button className="primary" onClick={next} autoFocus>
                {t.tutorialNext} →
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
