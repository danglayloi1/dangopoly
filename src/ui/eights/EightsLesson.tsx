import { EIGHTS_LESSON } from '../../games/eights/lesson';
import { EIGHTS_TEXT } from '../../games/eights/text';
import type { Lesson } from '../../games/lesson';
import { useLang } from '../../i18n/LangContext';
import { LessonBubble, useLesson } from '../Lesson';
import { EightsTable } from './EightsScreen';

/** Crazy Eights' guided first game, on the real table. */
export function EightsLesson({ onLeave, onPlay }: { onLeave: () => void; onPlay: () => void }) {
  const { t, uiLang } = useLang();
  const lesson = useLesson(EIGHTS_LESSON);
  return (
    <EightsTable
      state={lesson.state}
      me={0}
      onAct={lesson.act}
      onLeave={onLeave}
      leaveLabel={t.back}
      canDeal={false}
      title={`${EIGHTS_TEXT[uiLang].name} · ${t.tutorialStart}`}
      glow={lesson.current.glow}
      showGameOver={false}
      top={
        <LessonBubble
          lesson={EIGHTS_LESSON as Lesson<unknown, unknown>}
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
