import { useEffect, useRef, useState } from 'react';
import type { UiLang } from '../data/text';
import { lessonText, type Lesson } from '../games/lesson';
import { useLang } from '../i18n/LangContext';
import { speedFactor } from './animation';
import { Icon } from './icons';

const REPLY_MS = 1_100; // the computer's replies come one by one, so you can follow them

const WORDS: Record<UiLang, { step: (i: number, n: number) => string; next: string; wrong: string; play: string; done: string; exit: string }> = {
  vi: {
    step: (i, n) => `Bước ${i}/${n}`,
    next: 'Tiếp →',
    wrong: 'Chưa phải nước này: làm theo hướng dẫn nhé.',
    play: 'Chơi với máy →',
    done: 'Xong',
    exit: 'Thoát hướng dẫn',
  },
  nghe: {
    step: (i, n) => `Bước ${i}/${n}`,
    next: 'Tiếp →',
    wrong: 'Nỏ phải nước ni: làm theo hướng dẫn nghe.',
    play: 'Nhởi với máy →',
    done: 'Xong',
    exit: 'Thôi, nỏ học nựa',
  },
  en: {
    step: (i, n) => `Step ${i} of ${n}`,
    next: 'Next →',
    wrong: "That's not the move: follow the hint.",
    play: 'Play the computer →',
    done: 'Done',
    exit: 'Leave the tutorial',
  },
};

/**
 * Runs a lesson: the game as it stands, which step you're on, and your move. A move the step asks for
 * is played, then the computer's replies one by one, then the next step; any other move is refused.
 */
export function useLesson<S, A>(lesson: Lesson<S, A>) {
  const { uiLang } = useLang();
  const [state, setState] = useState(() => lesson.start(uiLang));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const current = lesson.steps[step];
  const act = (action: A) => {
    if (busy || !current.expect) return;
    if (!lesson.same(action, current.expect)) {
      setWrong(true);
      return;
    }
    setWrong(false);
    setState((s) => lesson.apply(s, action));
    const replies = current.replies ?? [];
    if (replies.length === 0) {
      setStep((i) => i + 1);
      return;
    }
    setBusy(true);
    const pause = REPLY_MS * Math.max(speedFactor(), 0.4);
    replies.forEach((reply, i) => {
      timers.current.push(
        setTimeout(() => {
          setState((s) => lesson.apply(s, reply));
          if (i === replies.length - 1) {
            setBusy(false);
            setStep((n) => n + 1);
          }
        }, (i + 1) * pause),
      );
    });
  };
  const next = () => {
    if (!current.expect && step < lesson.steps.length - 1) setStep(step + 1);
  };
  return { state, step, current, act, next, busy, wrong, last: step === lesson.steps.length - 1 };
}

interface BubbleProps {
  lesson: Lesson<unknown, unknown>;
  step: number;
  wrong: boolean;
  busy: boolean;
  onNext: () => void;
  onPlay: () => void; // after the last step: a real game against the computer
  onExit: () => void;
}

/** What to do now: the step's words, and Next when the step only explains. */
export function LessonBubble({ lesson, step, wrong, busy, onNext, onPlay, onExit }: BubbleProps) {
  const { uiLang } = useLang();
  const w = WORDS[uiLang];
  const current = lesson.steps[step];
  const last = step === lesson.steps.length - 1;
  return (
    <section className="lesson-bubble" aria-live="polite">
      <header>
        <Icon name="scroll" />
        <span className="lesson-step">{w.step(step + 1, lesson.steps.length)}</span>
        <button type="button" className="link lesson-exit" onClick={onExit}>
          {w.exit}
        </button>
      </header>
      <p>{lessonText(current, uiLang)}</p>
      {wrong && (
        <p className="lesson-wrong" role="alert">
          {w.wrong}
        </p>
      )}
      {!current.expect && !last && (
        <button type="button" className="primary" onClick={onNext} disabled={busy} autoFocus>
          {w.next}
        </button>
      )}
      {last && (
        <div className="lesson-end">
          <button type="button" className="secondary" onClick={onExit}>
            {w.done}
          </button>
          <button type="button" className="primary" onClick={onPlay} autoFocus>
            {w.play}
          </button>
        </div>
      )}
    </section>
  );
}
