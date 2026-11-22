'use client';

// Language provider for the web app (interior first). Mirrors the mobile flow:
// pick English / العربية, remember it, and switch the layout to right-to-left.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LANG_STORAGE_KEY, Lang, readStoredLang, setLangStore, isRtl } from './index';

interface I18nContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLanguage: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue>({ lang: 'en', dir: 'ltr', setLanguage: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Server + first client render are English (no hydration mismatch); the saved
  // language is applied right after mount.
  // Every interior page mounts its own shell, so read the saved language
  // synchronously on the client (no English flash between pages). On the very
  // first server-rendered load the shell shows only a spinner until auth is
  // checked, so there is no text to mismatch during hydration.
  const [lang, setLang] = useState<Lang>(() => {
    const saved = readStoredLang();
    setLangStore(saved);
    return saved;
  });

  useEffect(() => {
    const saved = readStoredLang();
    // Always re-assert: the previous page's shell resets the store when it unmounts
    setLangStore(saved);
    if (saved !== lang) setLang(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Leaving the interior app (e.g. to construction): back to English until those pages are translated
    return () => setLangStore('en');
  }, []);

  // <html lang/dir> follow the language while this provider is mounted
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = isRtl(lang) ? 'rtl' : 'ltr';
  }, [lang]);
  // Reset only when the interior app is left entirely (next page's shell sets it again)
  useEffect(() => () => {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  }, []);

  const setLanguage = useCallback((next: Lang) => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // private mode: keep it for this session only
    }
    setLangStore(next);
    setLang(next);
  }, []);

  return (
    <I18nContext.Provider value={{ lang, dir: isRtl(lang) ? 'rtl' : 'ltr', setLanguage }}>
      {/* Remount on change so every tr() call re-renders in the new language */}
      <React.Fragment key={lang}>{children}</React.Fragment>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
