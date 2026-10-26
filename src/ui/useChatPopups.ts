import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../net/protocol';

const CHAT_SHOWN_MS = 5_000;
const MAX_SHOWN = 3;

/**
 * Online: new chat messages from the others, to float up on screen for a few seconds like the
 * reactions. None while the chat is open (the messages are right there), and none for messages
 * that were already there when the screen opened.
 */
export function useChatPopups(chat: readonly ChatMessage[], you: number | null, chatOpen: boolean): ChatMessage[] {
  const [shown, setShown] = useState<ChatMessage[]>([]);
  const lastId = useRef(chat.at(-1)?.id ?? 0);

  useEffect(() => {
    const fresh = chat.filter((m) => m.id > lastId.current && m.seat !== you);
    lastId.current = Math.max(lastId.current, chat.at(-1)?.id ?? 0);
    if (chatOpen || fresh.length === 0) return;
    setShown((list) => [...list, ...fresh].slice(-MAX_SHOWN));
    // Each message leaves on its own timer (a newer message mustn't cancel an older one's).
    for (const m of fresh) setTimeout(() => setShown((list) => list.filter((x) => x.id !== m.id)), CHAT_SHOWN_MS);
  }, [chat]);

  useEffect(() => {
    if (chatOpen) setShown([]);
  }, [chatOpen]);

  return shown;
}
