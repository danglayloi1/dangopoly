import type { Lesson } from '../../games/lesson';
import { TIENLEN_LESSON } from '../../games/tienlen/lesson';
import { useLang } from '../../i18n/LangContext';
import { LessonBubble, useLesson } from '../Lesson';
import { TienLenTable } from './TienLenScreen';

/** Tiến lên's guided first game, on the real table. */
export function TienLenLesson({ onLeave, onPlay }: { onLeave: () => void; onPlay: () => void }) {
  const { t } = useLang();
  const lesson = useLesson(TIENLEN_LESSON);
  return (
    <TienLenTable
      state={lesson.state}
      me={0}
      onAct={lesson.act}
      onLeave={onLeave}
      leaveLabel={t.back}
      canDeal={false}
      title={`Tiến lên · ${t.tutorialStart}`}
      glow={lesson.current.glow}
      showGameOver={false}
      top={
        <LessonBubble
          lesson={TIENLEN_LESSON as Lesson<unknown, unknown>}
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
