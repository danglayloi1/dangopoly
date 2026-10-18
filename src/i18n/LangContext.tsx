import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Lang } from '../data/text';
import { STRINGS, type Strings } from './strings';

const STORAGE_KEY = 'dangopoly.lang';

interface LangValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Strings;
}

const LangContext = createContext<LangValue | null>(null);

function savedLang(): Lang {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'vi' || value === 'en') return value;
  } catch {
    // Storage can be unavailable (private mode); fall back to Vietnamese.
  }
  return 'vi';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(savedLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Not saving the preference is fine.
    }
  }, [lang]);

  return <LangContext.Provider value={{ lang, setLang, t: STRINGS[lang] }}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const value = useContext(LangContext);
  if (!value) throw new Error('useLang must be used inside <LangProvider>');
  return value;
}
