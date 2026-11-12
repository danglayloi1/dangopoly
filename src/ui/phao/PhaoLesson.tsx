import { PHAO_LESSON } from '../../games/phao/lesson';
import { PHAO_TEXT } from '../../games/phao/text';
import type { Lesson } from '../../games/lesson';
import { useLang } from '../../i18n/LangContext';
import { LessonBubble, useLesson } from '../Lesson';
import { PhaoTable } from './PhaoScreen';

/** Pháo Tết's guided first game, on the real table. */
export function PhaoLesson({ onLeave, onPlay }: { onLeave: () => void; onPlay: () => void }) {
  const { t, uiLang } = useLang();
  const lesson = useLesson(PHAO_LESSON);
  return (
    <PhaoTable
      state={lesson.state}
      me={0}
      onAct={lesson.act}
      onLeave={onLeave}
      leaveLabel={t.back}
      canDeal={false}
      title={`${PHAO_TEXT[uiLang].name} · ${t.tutorialStart}`}
      glow={lesson.current.glow}
      showGameOver={false}
      top={
        <LessonBubble
          lesson={PHAO_LESSON as Lesson<unknown, unknown>}
          step={lesson.step}
          wrong={lesson.wrong}
          busy={lesson.busy}
          onNext={lesson.next}
          onPlay={onPlay}
          onExit={onLeave}
        />
      }
    />
  );
}
