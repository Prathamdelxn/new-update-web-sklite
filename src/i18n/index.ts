// =============================================================================
// Web i18n (English / Arabic) — same idea as the mobile app's i18next setup.
// Keys are the English text itself, so untranslated text simply shows in English.
//   tr('Overview')                      -> 'نظرة عامة' when Arabic is on
//   tr('{{count}} tasks', { count: 3 }) -> interpolation like i18next
// The active language lives in a module store; <I18nProvider> remounts its
// subtree when it changes, so tr() can be called anywhere during render.
// =============================================================================

import arInterior from './ar.interior.json';

export type Lang = 'en' | 'ar';
export const LANG_STORAGE_KEY = 'skylite.lang';

const DICTIONARIES: Record<Exclude<Lang, 'en'>, Record<string, string>> = {
  ar: arInterior as Record<string, string>,
};

let current: Lang = 'en';
const normalizedCache: Partial<Record<Lang, Map<string, string>>> = {};

// Case/whitespace-insensitive, and 'in_progress' matches 'In Progress'
const normalize = (s: string) => s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

function normalizedDict(lang: Exclude<Lang, 'en'>): Map<string, string> {
  let m = normalizedCache[lang];
  if (!m) {
    m = new Map();
    for (const [k, v] of Object.entries(DICTIONARIES[lang])) m.set(normalize(k), v);
    normalizedCache[lang] = m;
  }
  return m;
}

function interpolate(text: string, vars?: Record<string, unknown>) {
  if (!vars) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])));
}

export function getLang(): Lang {
  return current;
}

export function setLangStore(lang: Lang) {
  current = lang;
}

export function isRtl(lang: Lang = current) {
  return lang === 'ar';
}

/** Translate English UI text into the active language (English passes through). */
export function tr<T>(text: T, vars?: Record<string, unknown>): T {
  if (typeof text !== 'string') return text;
  if (current === 'en' || !text.trim()) return interpolate(text, vars) as unknown as T;
  const dict = DICTIONARIES[current];
  let hit = dict[text];
  if (hit === undefined) {
    const trimmed = text.trim();
    hit = dict[trimmed] ?? normalizedDict(current).get(normalize(text));
    if (hit !== undefined) {
      // keep the surrounding whitespace of JSX text (" Delete ")
      const lead = text.match(/^\s*/)?.[0] ?? '';
      const trail = text.match(/\s*$/)?.[0] ?? '';
      hit = lead + hit + trail;
    }
  }
  return interpolate(hit ?? text, vars) as unknown as T;
}

export function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    return v === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}
