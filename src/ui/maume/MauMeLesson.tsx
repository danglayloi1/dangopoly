import { MAUME_LESSON } from '../../games/maume/lesson';
import { MAUME_TEXT } from '../../games/maume/text';
import type { Lesson } from '../../games/lesson';
import { useLang } from '../../i18n/LangContext';
import { LessonBubble, useLesson } from '../Lesson';
import { MauMeTable } from './MauMeScreen';

/** Màu Mè's guided first game, on the real table. */
export function MauMeLesson({ onLeave, onPlay }: { onLeave: () => void; onPlay: () => void }) {
  const { t, uiLang } = useLang();
  const lesson = useLesson(MAUME_LESSON);
  return (
    <MauMeTable
      state={lesson.state}
      me={0}
      onAct={lesson.act}
      onLeave={onLeave}
      leaveLabel={t.back}
      canDeal={false}
      title={`${MAUME_TEXT[uiLang].name} · ${t.tutorialStart}`}
      glow={lesson.current.glow}
      showGameOver={false}
      top={
        <LessonBubble
          lesson={MAUME_LESSON as Lesson<unknown, unknown>}
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
