import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { dataLang, type Lang, type UiLang } from '../data/text';
import { STRINGS, type Strings } from './strings';

const STORAGE_KEY = 'dangopoly.lang';

interface LangValue {
  lang: Lang; // for names of places, cards and tokens (Tiếng Nghệ uses the Vietnamese ones)
  uiLang: UiLang; // what the game talks in
  setLang: (lang: UiLang) => void;
  t: Strings;
}

const LangContext = createContext<LangValue | null>(null);

function savedLang(): UiLang {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'vi' || value === 'en' || value === 'nghe') return value;
  } catch {
    // Storage can be unavailable (private mode); fall back to Vietnamese.
  }
  return 'vi';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [uiLang, setLang] = useState<UiLang>(savedLang);
  const lang = dataLang(uiLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, uiLang);
    } catch {
      // Not saving the preference is fine.
    }
  }, [uiLang, lang]);

  return <LangContext.Provider value={{ lang, uiLang, setLang, t: STRINGS[uiLang] }}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  const value = useContext(LangContext);
  if (!value) throw new Error('useLang must be used inside <LangProvider>');
  return value;
}
